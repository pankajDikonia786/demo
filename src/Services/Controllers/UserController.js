const Sq = require("sequelize");
const bcrypt = require("bcrypt");
const fs = require("fs");
const fastCsv = require("fast-csv");
const PDFDocument = require("pdfkit-table");
const { DateTime } = require("luxon");
const { DeleteFile, SendEmail } = require("../../libs//Helper");
const { Users, SchoolDetails } = require("../Models/admin");
const cron = require('node-cron');

const { BssUsers, BssSchoolDetails, BssPermissionDetails,
    BssPermissionHistory, BssPermissionClassDorm, BssStudents, BssDormitories, BssSystemLogs,
    BssClasses, BssAttendanceUsers, BssStuLocChangeNotifications, BssRole, BssRolePermissions, BssRolePermClassDorm, BssSubscription } = require("../Models/common");
const { response } = require("express");


module.exports.CreateSchoolManager = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;
        const login_user = req.login_user;
        const user_details = req.body;
        let permission_data = user_details?.permission_data
        user_details.created_by = login_user.user_id;
        let fileData = req.file;
        fileData?.path ? user_details.avatar = fileData?.path : user_details.avatar = "";
        user_details.role_type = 3;

        if (await Users.findOne({ where: { email: user_details.email } })) {
            return res.send({
                status: 400,
                success: false,
                message: 'This eMail address already exists. Please use a different email account for this role.'
            })
        };
        let user_password
        if (user_details.password) {
            user_password = user_details.password;
            user_details.original_password = user_details.password;
            user_details.password = await bcrypt.hash(user_details.password, 10);
        };

        const userRes = await Users.create(user_details,);

        config_sequelize.transaction(async (transaction) => {

            user_details.user_id = userRes.user_id;
            user_details.user_uuid = userRes.user_uuid;

            const BssUsersModel = await BssUsers(await config_sequelize);
            const BssPermissionDetailsModel = await BssPermissionDetails(config_sequelize);
            const BssPermissionClassDormModel = await BssPermissionClassDorm(config_sequelize);
            const BssPermissionHistoryModel = await BssPermissionHistory(config_sequelize);

            permission_data = JSON.parse(permission_data);

            //temporary check for testing 
            if (permission_data) {
                /* Create user permissions */
                permission_data.created_by = login_user.user_id;
                permission_data.user_id = userRes.user_id;
                const permissionDetailsRes = await BssPermissionDetailsModel.create(permission_data, { transaction });
                //create permission history 

                let dorm_data = permission_data.dorm_data;
                let class_data = permission_data.class_data;
                //create dormitory data
                if (dorm_data.length > 0) {

                    let dormitory_array = [];
                    //find or create dormitory data
                    dorm_data.forEach((dorm_value) => {

                        dormitory_array.push({
                            user_id: user_details.user_id,
                            dormitory_id: dorm_value.dormitory_id, permission_detail_id: permissionDetailsRes.permission_detail_id
                        });
                    });
                    await BssPermissionClassDormModel.bulkCreate(dormitory_array, { transaction });
                };
                //create class data
                if (class_data.length > 0) {
                    let class_data = permission_data.class_data;

                    let class_array = [];

                    //create class data
                    class_data.forEach((class_value) => {
                        class_array.push({
                            user_id: user_details.user_id, class_id: class_value.class_id,
                            permission_detail_id: permissionDetailsRes.permission_detail_id,
                        });
                    });
                    await BssPermissionClassDormModel.bulkCreate(class_array, { transaction });
                };
                /*  End user  permissions */

                //create permission history
                await BssPermissionHistoryModel.create({
                    user_id: user_details.user_id,
                    permission_history_info: permission_data, created_by: login_user.user_id
                }, { transaction });
            };
            //crete bss user(specific school)
            await BssUsersModel.create(user_details, { transaction })

            /***************Send  Email To School User**************/

            let email_parametars = {
                user_name: `${user_details.first_name} ${user_details.last_name}`,
                user_email: `${user_details.email}`,
                user_password: user_password,
                APP_URL: process.env.APP_URL,
                login_link: `${process.env.APP_BUILD_URL}/`,
            };

            let email_template = fs.readFileSync(`${appRoot}/src/Services/Views/email-templates/SchoolUser.html`, "utf8");

            email_template = email_template.replace(/user_name|user_email|user_password|APP_URL|login_link/gi, function (matched) {
                return email_parametars[matched];
            });

            let mail_options = {
                html: email_template,
                to: user_details.email,
                from: process.env.MAIL_FROM_ADDRESS,
                subject: "BSS -School Manager Registration",
            };
            SendEmail(mail_options)
                .then(async (info) => {
                    console.log("School User login SendEmail info------------", info);
                })
                .catch((error) => {
                    console.log("School User login SendEmail error------------", error);
                });

            /******************End Send  Email To School User**************/
            return res.json({
                status: 200,
                success: true,
                message: "Manager created successfully!"
            });
        });

    } catch (error) {
        console.log(error);
        res.json({
            status: 200,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })
    };

};

module.exports.GetAllManagersBySchoolId = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const { page, limit, order, sort, search, is_user_activate, school_detail_id } = req.query;
    const login_user = req.login_user;

    let where_object = {
        school_detail_id, role_type: { [Sq.Op.gt]: 2 },
        user_id: { [Sq.Op.ne]: login_user.user_id }
    };
    let query_object = {};

    if (is_user_activate === "true" || is_user_activate === true) {
        where_object.is_user_activate = true;
    }

    if (is_user_activate === "false" || is_user_activate === false) {
        where_object.is_user_activate = false;
    }

    if (search) {
        where_object = {
            ...where_object,
            [Sq.Op.or]: [
                //check the first name or last name with case insensitivity
                Sq.where(Sq.fn("concat", Sq.col("first_name"), " ", Sq.col("last_name")), { [Sq.Op.iLike]: `%${search}%` }),

                {
                    email: Sq.where(Sq.fn("LOWER", Sq.col("email")), "LIKE", search.toLowerCase()),
                },
            ],
        };
    }
    if (page && limit) {

        query_object.offset = 0 + (page - 1) * limit;
        query_object.limit = limit;
    }

    if (order && sort) {
        query_object = {
            ...query_object,
            order: [[sort, order]]
        }
    }
    const BssUsersModel = await BssUsers(await config_sequelize);
    const BssSubscriptionModel =await BssSubscription(await config_sequelize);

    await BssUsersModel.findAndCountAll({
        where: where_object,

        attributes: {
            exclude: ["deleted_by", "deleted_date", "updated_date", "updated_by", "created_by",]
        }, ...query_object

    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get all User's by school successfully!"
        })

    }).catch((error) => {
        console.log(error)
        res.json({
            status: 200,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })

    })

}
    module.exports.GetAllManagersListBySchoolId = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const { school_detail_id } = req.query;
    const BssUsersModel = await BssUsers(await config_sequelize);
    await BssUsersModel.findAndCountAll({
        where: {
            school_detail_id,
            is_user_activate: true,
            role_type: { [Sq.Op.gte]: 2 }
        },

        attributes: ["user_id", "user_uuid", "first_name", "last_name"], order: [["first_name", "asc"]]

    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get all User's List by School successfully!"
        })

    }).catch((error) => {
        console.log(error)
        res.json({
            status: 200,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })

    })

};
    module.exports.GetSchoolManagerById = async (req, res) => {
        login_user =req.login_user
        // console.log("::::::::::::::",login_user)
      console.log(login_user.email.split("@")[1])
      let cp =575
      let sp =570


      const loss = (cp-sp)*100/100
      console.log("loss::::::::::::::::::::",loss) 

    // const config_sequelize = req.config_sequelize;
    // const { user_uuid } = req.query;
    // const config_sequelize =req.config_sequelize
    // const{preferred_name,student_phone} =req.body
    // const BssUsersModel = await BssUsers(await config_sequelize);
    // const BssStudentsModel = await BssStudents(await config_sequelize);

    //   console.log("::::::::::::::",student_phone)

    // let responseStudents = await BssStudentsModel.findOne(
    //     {
    //         where: {
    //             [Sq.Op.or]: [
    //                 Sq.where(Sq.fn("LOWER", Sq.col("preferred_name"),), "LIKE", preferred_name.toLowerCase()),
    //                 Sq.where(Sq.fn('PGP_SYM_DECRYPT', Sq.col('student_phone'), PG_ENCRYPT_KEY), "LIKE",student_phone),
    //             // Sq.where(('PGP_SYM_DECRYPT', Sq.col("student_phone"), PG_ENCRYPT_KEY),), "LIKE",student_phone.toLowerCase()

    //         ]

    //         }
    //     });
    //     if(responseStudents){
    //         console.log(":::::::::::::;",responseStudents)
    //     }

    // const values = [
    //     { name: 'someName1' },
    //     { name: 'someName2' },
    //     { name: 'someName2' },
    //     { name: 'someName2' }
    //   ]

    // //   values.length ==0
    //   while(values.length > 0) {
    //     values.pop();
    // }
    //   console.log(values)
      
    //   const uniqueValues = new Set(values.map(v.name => v.name));
    //   console.log(":::::::::::::::::::::::::::::::cdcdbncdddvcdnbbbbbbc",uniqueValues,index)
    //   if (uniqueValues.size < values.length) {
    //     console.log('duplicates found')
    //   }


    // BssUsersModel.findOne({
    //     where: { user_uuid },
    // },
    // ).then(async (response) => {
    //     const userRes = await Users.scope("withPassword").findOne({ where: { user_uuid }, });
    //     response.password = userRes.original_password;
    //     res.json({
    //         status: 200,
    //         success: true,
    //         data: response,
    //         message: "Get User Details successfully!"
    //     })

    // }).catch((error) => {
    //     res.json({
    //         status: 200,
    //         success: false,
    //         error: error,
    //         message: "Something went wrong. Please try again or reach out to support if the issue persists."
    //     });
    // });


    // module.exports.DragAndDropRole =async(req,res)=>{
//         const config_sequelize =req.config_sequelize
//         const login_user =req.login_user
//         const {role_ids}= req.body
  
//         let where_obj = {}
//         where_obj ={
//             ...where_obj,
//             role_id:role_ids
//         }

//     const BssRoleModel =await BssRole(config_sequelize)
    
// let response; // Declare response outside the callback

// config_sequelize.transaction(async (transaction) => {
//   try {
//     response = await BssRoleModel.findAll({
//       where: where_obj,
//     });

//     const role1 = response[0].dataValues;
//     const role2 = response[1].dataValues;

//     const dataToSwap = { ...role1 };
//     delete dataToSwap.role_id;

//     const dataToSwap2 = { ...role2 };
//     delete dataToSwap2.role_id;

//     await BssRoleModel.update(dataToSwap2, {
//       where: { role_id: role1.role_id },
//       transaction,
//     });

//     await BssRoleModel.update(dataToSwap, {
//       where: { role_id: role2.role_id },
//       transaction,
//     });

//     res.json({
//       status: 200,
//       success: true,
//       response: "Roles swap successfully",
//     });
//   } catch (error) {
//     res.status(500).json({
//       status: 500,
//       success: false,
//       error: error.message,
//     });
//   }
// });
}

module.exports.UpdateUserProfile = async (req, res) => {

    try {
        const config_sequelize = req.config_sequelize;
        const login_user = req.login_user;
        const user_details = req.body;
        let { user_uuid } = user_details;

        delete user_details.user_uuid;
        delete user_details.user_id;
        user_details.updated_by = login_user.user_id;

        if (typeof req?.file !== "undefined" && req?.file?.path) {
            user_details.avatar = req.file.path;

            let userResponse = await Users.findOne({ where: { user_uuid } });

            if (userResponse?.avatar) {

                let filePath = `${appRoot}/${userResponse?.avatar}`;
                await DeleteFile(filePath)
            };
        };
        await Users.update(user_details, { where: { user_uuid } });

        //school manager
        const BssUsersModel = await BssUsers(await config_sequelize);


        await BssUsersModel.update(user_details, { where: { user_uuid: user_uuid }, });

        return res.json({
            status: 200,
            success: true,
            message: "User details updated successfully!"
        });


    } catch (error) {
        console.log(error);
        return res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });
    };

};


module.exports.UpdateSchooManager = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const user_details = req.body;
    let { user_uuid, user_id, permission_data, } = user_details;

    delete user_details.user_uuid;
    delete user_details.user_id;
    user_details.updated_by = login_user.user_id;

    if (typeof req?.file !== "undefined" && req?.file?.path) {
        user_details.avatar = req.file.path;

        let userResponse = await Users.findOne({ where: { user_uuid } });

        if (userResponse?.avatar) {

            let filePath = `${appRoot}/${userResponse?.avatar}`;
            await DeleteFile(filePath)
        };
    };

    await Users.update(user_details, { where: { user_uuid } });

    try {

        const BssUsersModel = await BssUsers(await config_sequelize);
        const BssPermissionDetailsModel = await BssPermissionDetails(config_sequelize);
        const BssPermissionClassDormModel = await BssPermissionClassDorm(config_sequelize);
        const BssPermissionHistoryModel = await BssPermissionHistory(config_sequelize);

        await BssUsersModel.update(user_details, { where: { user_uuid: user_uuid }, });
        permission_data = JSON.parse(permission_data);

        ////////////////////////////////////update permissions
        config_sequelize.transaction(async (transaction) => {
            if (permission_data) {


                permission_data.updated_by = login_user.user_id;
                await BssPermissionDetailsModel.update(permission_data,
                    { where: { user_id }, transaction });

                permission_data.updated_by = login_user.user_id;


                let dorm_data = permission_data.dorm_data;
                let class_data = permission_data.class_data;

                //create dormitory data
                if (dorm_data.length > 0) {

                    let dormitory_ids = [];
                    //find or create dormitory data
                    dorm_data.forEach(async (dorm_value) => {

                        await BssPermissionClassDormModel.findOrCreate({
                            where: { user_id, dormitory_id: dorm_value.dormitory_id, },
                            defaults: {
                                user_id, dormitory_id: dorm_value.dormitory_id,
                            },
                        });
                        dormitory_ids.push(dorm_value.dormitory_id);
                    });

                    //delete existing class id data
                    await BssPermissionClassDormModel.destroy({
                        where:
                            { dormitory_id: { [Sq.Op.notIn]: dormitory_ids }, user_id, }, transaction
                    });
                } else {
                    await BssPermissionClassDormModel.destroy({
                        where:
                            { user_id, class_id: null }, transaction
                    });
                }
                //create class data
                if (class_data.length > 0) {

                    let class_ids = [];
                    //find or create class data
                    class_data.forEach(async (class_value) => {

                        await BssPermissionClassDormModel.findOrCreate({
                            where: { user_id, class_id: class_value.class_id, },
                            defaults: {
                                user_id, class_id: class_value.class_id,
                            },
                        });
                        class_ids.push(class_value.class_id)
                    });

                    //delete existing class id data
                    await BssPermissionClassDormModel.destroy({
                        where:
                            { class_id: { [Sq.Op.notIn]: class_ids }, user_id }, transaction
                    });
                } else {
                    await BssPermissionClassDormModel.destroy({
                        where:
                            { user_id, dormitory_id: null }, transaction
                    });
                }

                //create permission history
                await BssPermissionHistoryModel.create({
                    user_id: user_id,
                    permission_history_info: permission_data, created_by: login_user.user_id
                }, { transaction });
            };

            return res.json({
                status: 200,
                success: true,
                message: "Manager details updated successfully!"
            });

        });
    } catch (error) {
        console.log(error);
        return res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });
    };

};


    module.exports.UpdateManagerPassword = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const user_detail = req.body;

    if (user_detail.password !== user_detail.confirm_password) {
        return res.json({
            status: 400,
            success: false,
            message: "Password doesn't match!",
        });
    }
    if (user_detail.password) {
        user_detail.original_password = user_detail.password;
        user_detail.password = await bcrypt.hash(user_detail.password, 10);
    };
    Users.update(user_detail, {
        where:
            { user_uuid: user_detail.user_uuid }, returning: true, raw: true
    })
        .then(async (response) => {
            //Update the user password in the school database
            try {
                const BssUsersModel = await BssUsers(config_sequelize);

                await BssUsersModel.update(user_detail, { where: { user_uuid: user_detail.user_uuid } });

                return res.json({
                    status: 200,
                    success: true,
                    message: "Password updated successfully!",
                });
            } catch (error) {
                console.log(error);
                return res.json({
                    status: 400,
                    success: false,
                    error: error,
                    message: "Something went wrong. Please try again or reach out to support if the issue persists."
                });
            };
        })
        .catch((error) => {
            console.log(error);
            return res.json({
                status: 400,
                success: false,
                message: "Something went wrong. Please try again or reach out to support if the issue persists."
            });
        });

};

module.exports.ArchiveOrUnarchiveManager = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const user_archive_details = req.body;
    const user_uuid = user_archive_details.user_uuid;
    delete user_archive_details.user_uuid;
    user_archive_details.updated_by = login_user.user_id;

    Users.update(user_archive_details, { where: { user_uuid } }).then(async (response) => {

        const BssUsersModel = await BssUsers(await config_sequelize);
        try {

            await BssUsersModel.update(user_archive_details, { where: { user_uuid } })

        } catch (error) {
            res.json({
                status: 200,
                success: false,
                error: error,
                message: "Something went wrong. Please try again or reach out to support if the issue persists."
            })
        }
        res.json({
            status: 200,
            success: true,
            message: `Manager ${user_archive_details.is_user_activate == true | user_archive_details.is_user_activate == "true" ? "Activated" : "Deactivated"} Successfully!`
        })

    }).catch((error) => {
        console.log(error);
        res.json({
            status: 200,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })
    })
}

    module.exports.ExportManagersCsv = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const school_code = req.headers.school_code;
    const { order, sort, search, is_user_activate } = req.query;

    let where_object = { role_type: { [Sq.Op.ne]: 2 } };
    let query_object = {};

    if (is_user_activate === "true" || is_user_activate === true) {
        where_object.is_user_activate = true;
    }

    if (is_user_activate === "false" || is_user_activate === false) {
        where_object.is_user_activate = false;
    }

    if (search) {
        where_object = {
            ...where_object,
            [Sq.Op.or]: [
                //check the first name or last name with case insensitivity
                Sq.where(Sq.fn("concat", Sq.col("first_name"), " ", Sq.col("last_name")), { [Sq.Op.iLike]: `%${search}%` }),

                {
                    email: Sq.where(Sq.fn("LOWER", Sq.col("email")), "LIKE", search.toLowerCase()),
                },
            ],
        };
    }


    if (order && sort) {
        query_object = {
            ...query_object,
            order: [[sort, order]]
        }
    }

    const BssUsersModel = await BssUsers(await config_sequelize);

    BssUsersModel.findAll({
        where: where_object, ...query_object, attributes:
            [["first_name", "First Name"], ["last_name", "Last Name"], ["email", "Email"],
            ["contact_one", "Contact No"], ["is_user_activate", "Active Status"], ["designation", "Designation"]]
        , raw: true
    })
        .then((response) => {

            let responseToJsonData = JSON.stringify(response);
            let parseData = JSON.parse(responseToJsonData);

            let file_name = `Export-ManagersCsv-${new Date().getTime()}.csv`;
            let uploadFilePath = `uploads/${school_code}/${file_name}`;
            const createCsvFile = fs.createWriteStream(uploadFilePath);

            fastCsv.write(parseData, { headers: true }).on("finish", function () {

                return res.json({
                    status: 200,
                    success: true,
                    message: "Manager's Details Exported successfully!",
                    file: process.env.APP_URL + "/" + uploadFilePath
                });

            }).pipe(createCsvFile);

            //Delete the file after 10 seconds
            setTimeout(async () => {
                let filePath = `${appRoot}/${uploadFilePath}`;
                await DeleteFile(filePath)
            }, "10000");

        }).catch((error) => {
            console.log(error);
            res.json({
                status: 400,
                success: false,
                message: "Something went wrong. Please try again or reach out to support if the issue persists."
            })
        })

}

module.exports.ExportManagersPdf = async (req, res) => {
    const { order, sort, search, is_user_activate, } = req.query;
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const { timezone } = login_user.user_school;
    const school_code = req.headers.school_code;

    let where_object = { role_type: { [Sq.Op.gt]: 2 } };
    let query_object = {};

    if (is_user_activate === "true" || is_user_activate === true) {
        where_object.is_user_activate = true;
    }

    if (is_user_activate === "false" || is_user_activate === false) {
        where_object.is_user_activate = false;
    }

    if (search) {
        where_object = {
            ...where_object,
            [Sq.Op.or]: [
                //check the first name or last name with case insensitivity
                Sq.where(Sq.fn("concat", Sq.col("first_name"), " ", Sq.col("last_name")), { [Sq.Op.iLike]: `%${search}%` }),

                {
                    email: Sq.where(Sq.fn("LOWER", Sq.col("email")), "LIKE", search.toLowerCase()),
                },
            ],
        };
    }

    if (order && sort) {
        query_object = {
            ...query_object,
            order: [[sort, order]]
        }
    }

    const BssUsersModel = await BssUsers(await config_sequelize);
    BssUsersModel.findAll({
        where: where_object,
        attributes: [[Sq.fn('concat', Sq.col("first_name"), ' ', Sq.col("last_name")), "user_fullname"],
            "contact_one", "email", "is_user_activate", "designation"
        ], raw: true
    }).then((response) => {
        console.log(response)
        if (response.length === 0) {

            return res.json({
                status: 400,
                success: true,
                message: "User's Data  Doesn't exists!",

            });
        }

        let userArray = [];
        let serial_no = 1;

        response.forEach(async (userValue) => {
            let user_status;
            userValue.is_user_activate === true ? user_status = "Active" : user_status = "Deactive";
            userArray.push({
                serial_no, user_fullname: userValue.user_fullname, designation: userValue.designation,
                contact_one: userValue.contact_one, user_status, email: userValue.email
            })
            serial_no++;
        })

        let file_name = `Export-ManagersPdf-${new Date().getTime()}.pdf`;
        let uploadFilePath = `uploads/${school_code}/${file_name}`;
        const createPdfFile = fs.createWriteStream(uploadFilePath);

        // init document
        let doc = new PDFDocument({ margin: 25, size: 'A4' });
        // save document

        doc.pipe(createPdfFile);

        // table
        const table = {
            title: "Manager's Details",
            subtitle: `Generated by Boarding School Suit (${DateTime.now().setZone(timezone).toFormat(('MM-dd-yyyy'))})`,

            headers: [
                { label: "S.No", property: 'serial_no', width: 50, renderer: null, padding: 5, },
                { label: "Name", property: 'user_fullname', width: 130, renderer: null, },
                { label: "Designation", property: 'designation', width: 92, renderer: null, },
                { label: "Email", property: 'email', width: 150, renderer: null },
                { label: "Contact No", property: 'contact_one', width: 80, renderer: null },
                { label: "Status", property: 'user_status', width: 40, renderer: null },
                ,
            ],
            datas: [...userArray,],
            rows: [],
        };
        // the magic (async/await)
        doc.table(table,);
        doc.end();

        res.json({
            status: 200,
            success: true,
            message: "Manager's Details Exported successfully!",
            file: process.env.APP_URL + "/" + uploadFilePath
        });


        //Delete the file after 10 seconds
        setTimeout(async () => {
            let filePath = `${appRoot}/${uploadFilePath}`;
            await DeleteFile(filePath)
        }, "10000")

    }).catch((error) => {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })
    })
};

    module.exports.UpdateManagerPermissions = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const permission_details = req.body;

    let { user_id, permission_detail_id, dorm_data, class_data, } = permission_details;
    delete permission_details.permission_detail_id;
    delete permission_details.user_id;
    permission_details.updated_by = login_user.user_id;

    const BssPermissionDetailsModel = await BssPermissionDetails(config_sequelize);
    const BssPermissionHistoryModel = await BssPermissionHistory(config_sequelize);
    const BssPermissionClassDormModel = await BssPermissionClassDorm(config_sequelize);
    try {
        await config_sequelize.transaction(async (transactionInstance) => {

            dorm_data = JSON.parse(dorm_data);
            class_data = JSON.parse(class_data);

            await BssPermissionDetailsModel.update(permission_details,
                { where: { user_id }, transaction: transactionInstance });
            //create permission history 
            delete permission_details.updated_by;

            //create dormitory data
            if (dorm_data.length > 0) {

                dormitory_ids = [];
                //find or create dormitory data
                dorm_data.forEach((dorm_value) => {

                    BssPermissionClassDormModel.findOrCreate({
                        where: { user_id: user_id, dormitory_id: dorm_value.dormitory_id },
                        defaults: {
                            user_id: user_id,
                            dormitory_id: dorm_value.dormitory_id, permission_detail_id
                        },
                        transaction: transactionInstance
                    });
                    dormitory_ids.push(dorm_value.dormitory_id);
                });

                //delete existing class id data
                await BssPermissionClassDormModel.destroy({
                    where:
                        { dormitory_id: { [Sq.Op.notIn]: dormitory_ids }, user_id: user_id },

                    transaction: transactionInstance
                });
            };
            //create class data
            if (class_data.length > 0) {

                let class_ids = [];
                //find or create class data
                class_data.forEach((class_value) => {

                    BssPermissionClassDormModel.findOrCreate({
                        where: { user_id: user_id, class_id: class_value.class_id },
                        defaults: {
                            user_id: user_id, class_id: class_value.class_id,
                            permission_detail_id
                        },
                        transaction: transactionInstance
                    });
                    class_ids.push(class_value.class_id)
                });

                //delete existing class id data
                await BssPermissionClassDormModel.destroy({
                    where:
                        { class_id: { [Sq.Op.notIn]: class_ids }, user_id: user_id },

                    transaction: transactionInstance
                });

            };
            //create permission history
            await BssPermissionHistoryModel.create({
                user_id: user_id,
                permission_history_info: permission_details,
                created_by: login_user.user_id
            },
                { transaction: transactionInstance });

        });

        res.json({
            status: 200,
            success: true,
            message: "Permission updated successfully!",
        });

    } catch (error) {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });
    };
};

    module.exports.GetManagerPermissonDetailsById = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const { user_id } = req.query;

    const BssPermissionDetailsModel = await BssPermissionDetails(config_sequelize);
    const BssPermissionClassDormModel = await BssPermissionClassDorm(config_sequelize);
    const BssClassesModel = await BssClasses(config_sequelize);
    const BssDormitoriesModel = await BssDormitories(config_sequelize);

    BssPermissionDetailsModel.findOne({
        where: { user_id }, attributes: {
            exclude: ["created_by", "updated_by", "deleted_by",
                "updated_date", "deleted_date"]
        },
        include: {
            //class or dormitory permissions data
            model: BssPermissionClassDormModel, as: "perm_class_dorm",
            attributes: ["permission_class_dorm_id"],
            include: [
                { model: BssClassesModel, as: "permi_class_data", attributes: ["class_id", "class_name"] },
                {
                    model: BssDormitoriesModel, as: "permi_dorm_data",
                    attributes: ["dormitory_id",
                        [Sq.fn('PGP_SYM_DECRYPT', Sq.col('dormitory_name'), PG_ENCRYPT_KEY), "dormitory_name"],]
                }
            ]
        },
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Permission details successfully!",
        });

    }).catch((error) => {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });

    });

};

    module.exports.GetManagerPermissonHistoryById = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const { user_id } = req.query;

    const BssPermissionHistoryModel = await BssPermissionHistory(config_sequelize);
    BssPermissionHistoryModel.findAll({ where: { user_id } }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Permission history successfully!",
        });

     }).catch((error) => {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error:error.message,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
         });
     });
   };


    module.exports.GetRoleAndPermissionList = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;
        const BssRoleModel = await BssRole(config_sequelize);
        const BssRolePermissionsModel = await BssRolePermissions(config_sequelize);
        const BssRolePermClassDormModel = await BssRolePermClassDorm(config_sequelize);
        const BssClassesModel = await BssClasses(config_sequelize);
        const BssDormitoriesModel = await BssDormitories(config_sequelize);

        const roleRes = await BssRoleModel.findAll({
            where: { is_role_activate: true },
            attributes: ["role_uuid", "role_id", "role_name"],
            include: [{
                model: BssRolePermissionsModel, as: "roll_perm", required: true,
                include: {
                    //class or dormitory permissions data
                    model: BssRolePermClassDormModel,
                    attributes: ["role_perm_class_dorm_id"],
                    separate: true,
                    include: [
                        { model: BssClassesModel, as: "roll_perm_class", attributes: ["class_id", "class_name"] },
                        {
                            model: BssDormitoriesModel, as: "roll_perm_dorm",
                            attributes: ["dormitory_id",
                                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('dormitory_name'), PG_ENCRYPT_KEY), "dormitory_name"],]
                        }
                    ]
                }
            }]
        });
        res.json({
            status: 200,
            success: true,
            data: roleRes
        });
    } catch (error) {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });
    };
};


module.exports.GetRoleAndPermissionList = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;
        const BssRoleModel = await BssRole(config_sequelize);
        const BssUsersModel =await BssUsers(config_sequelize)

        const BssRolePermissionsModel = await BssRolePermissions(config_sequelize);
        const BssRolePermClassDormModel = await BssRolePermClassDorm(config_sequelize);
        const BssClassesModel = await BssClasses(config_sequelize);
        const BssDormitoriesModel = await BssDormitories(config_sequelize);

        const roleRes = await BssRoleModel.findAll({
            where: { is_role_activate: true },
            attributes: ["role_uuid", "role_id", "role_name"],
            include: [{
                model: BssRolePermissionsModel, as: "roll_perm", required: true,
                include: {
                    //class or dormitory permissions data
                    model: BssRolePermClassDormModel,
                    attributes: ["role_perm_class_dorm_id"],
                    separate: true,
                    include: [
                        { model: BssClassesModel, as: "roll_perm_class", attributes: ["class_id", "class_name"] },
                        {
                            model: BssDormitoriesModel, as: "roll_perm_dorm",
                            attributes: ["dormitory_id",
                                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('dormitory_name'), PG_ENCRYPT_KEY), "dormitory_name"],]
                        }
                    ]
                }
            }]
        });
        res.json({
            status: 200,
            success: true,
            data: roleRes
        });
    } catch (error) {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });
    };
};






//working pending
module.exports.GetLoginUserPermissions = async (req, res, next) => {
    const login_user = req.login_user;
    const config_sequelize = req.config_sequelize;
    const { user_id } = login_user;

    const BssPermissionDetailsModel = await BssPermissionDetails(config_sequelize);
    const BssPermissionClassDormModel = await BssPermissionClassDorm(config_sequelize);

    BssPermissionDetailsModel.findOne({
        where: { user_id }, attributes: {
            exclude: ["created_date", "updated_date",
                "created_by", "updated_by", "deleted_by", "deleted_date"]
        },
        include: {
            model: BssPermissionClassDormModel, as: "perm_class_dorm",
            attributes: ["permission_class_dorm_id", "permission_detail_id",
                "user_id", "class_id", "dormitory_id"]
        }
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response
        });
    }).catch((error) => {
        console.log(error)
        res.json({
            status: 400,
            success: false,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });

    });

};



module.exports.GetStuLocNotificationsbyUserId = async (req, res, next) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;

    const BssStuLocChangeNotificationsModel = await BssStuLocChangeNotifications(config_sequelize);
    const BssStudentsModel = await BssStudents(config_sequelize);
    const BssDormitoriesModel = await BssDormitories(config_sequelize);
    const BssAttendanceUsersModel = await BssAttendanceUsers(config_sequelize);
    const BssUsersModel = await BssUsers(config_sequelize);

    BssStuLocChangeNotificationsModel.findAll({
        where: {
            user_id: login_user.user_id,
        },
        attributes: ["stu_loc_change_notification_id", "stu_loc_change_notification_uuid",
            "stu_current_loc_name", "is_notification_read", "created_date"],
        include: [{
            model: BssStudentsModel, attributes:
                ["student_id", "student_first_name", "student_last_name", "class_name"],
            include: {
                model: BssDormitoriesModel,
                as: "dormitory_data",
                attributes: {
                    include: [[
                        Sq.fn('PGP_SYM_DECRYPT', Sq.col('dormitory_name'), PG_ENCRYPT_KEY), "dormitory_name"
                    ]],
                    exclude: ["dormitory_type", "bio_note", "dormitory_image", "dormitory_address", "created_by",
                        "updated_by", "deleted_by", "created_date", "updated_date", "deleted_date", "school_detail_id"]
                }
            }
        },
        {
            model: BssAttendanceUsersModel, as: "atten_user_data",
            attributes: ["attendance_title"]
        },
        { model: BssUsersModel, attributes: ["user_id", "first_name", "last_name"] }
        ],

    }).then(async (response) => {

        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get user notifications by id successfully!"
        });
    }).catch((error) => {
        console.log(error)
        res.json({
            status: 400,
            success: false,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });
    });

};


module.exports.UpdateStuLocNotificationStatus = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const { user_id } = req.body;

    const BssStuLocChangeNotificationsModel = await BssStuLocChangeNotifications(config_sequelize);
    BssStuLocChangeNotificationsModel.update({ is_notification_read: true }, { where: { user_id } }).then((response) => {
        res.json({
            status: 200,
            success: true,
            message: `User Notifications status updated successfully!`
        })

    }).catch((error) => {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });

    });
};



module.exports.DeleteStuLocNotificationsbyUserId = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const { user_id } = req.body;

    const BssStuLocChangeNotificationsModel = await BssStuLocChangeNotifications(config_sequelize);
    BssStuLocChangeNotificationsModel.destroy({ where: { user_id } }).then((response) => {
        res.json({
            status: 200,
            success: true,
            message: `User Notifications Deleted successfully!`
        })

    }).catch((error) => {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })

    })
  };

  
    module.exports.BssSystemLogs = async (req, res) => {
    const config_sequelize = req.config_sequelize
    // const url = req.protocol+"://"+req.headers.host
    const { page, limit, sort, order, search } = req.query

    let query_data = {}
    let where_data = {}
    
    if (search) {
        where_data = {
            ...where_data,
            html_info: Sq.where(Sq.col("html_info"), { [Sq.Op.iLike]: `%${search}%`}),
        }
    }
    if (page && limit) {
        query_data = {
            ...query_data,
            limit: limit,
            offset: 0 + (page - 1) * limit
        }
    }

        if(sort && order){
            query_data.order = [[sort ,order]]
        }

    const BssSystemLogsMdoel = await BssSystemLogs(config_sequelize)
    try {
        const response = await BssSystemLogsMdoel.findAndCountAll({ 
            where: {
                ...where_data
             },
            attributes: { 
                exclude: ["created_by", "updated_by", "deleted_by"]
            }, ...query_data
        })

        res.json({
            status: 200,
            success: true,
            data: response,
            message: "All System Logs Get Successfully"
        })
    } catch (error) {
        res.json({
            status: 200,
            success: false,
            error: error.message,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })
    }
}


module.exports.createUserSubscription =async(req,res)=>{
    const login_user =req.login_user
    const config_sequelize =req.config_sequelize
    const subscriptionDetails =req.body
    subscriptionDetails.created_by= login_user.user_id

    const BssSubscriptionModel =await BssSubscription(await config_sequelize)

    BssSubscriptionModel.create(subscriptionDetails).then((response)=>{
        res.json({
            status:200,
            success:true,
            message:"Your subscription has been successfully added."
        })
    }).catch((error)=>{
        res.json({
            status:400,
            success:false,
            message:"Something went wrong. Please try again or reach out to support if the issue persists."
        })
    })

}
cron.schedule('* * * * *',async()=>{
    console.log("this this schedule")
})




