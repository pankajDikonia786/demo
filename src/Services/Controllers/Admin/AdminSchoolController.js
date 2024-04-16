const Sq = require("sequelize");
const bcrypt = require("bcrypt");
const fs = require("fs");
const sequelize = require("../../dbconfig");
const { SendEmail } = require("../../../libs/Helper");
const { configNewDb } = require("../../../libs/NewDb");
const { CreateOrUpdateSchoolDatabase } = require("../../../libs/NewDb");
const { SchoolDetails, Users,BssSubscription} = require("../../Models/admin");
const { BssUsers, BssSchoolDetails} = require("../../Models/common");
const { DeleteFile } = require("../../../libs/Helper");
// const BssSubscription = require("../../Models/common/BssSubscription");

//working on pending user email login details
module.exports.CreateSchool = async (req, res) => {
    const school_detail = req.body;
    const file_data = req.files;
    console.log(file_data)
    school_detail.actual_school_code = school_detail.school_code;
    school_detail.school_code = school_detail.school_code.toLowerCase();

    //school manager(avatar)image
    file_data?.avatar ? school_detail.avatar = file_data?.avatar[0].path : school_detail.avatar = ""
    file_data?.school_logo ? school_detail.school_logo = file_data?.school_logo[0].path : school_detail.school_logo = ""

    console.log(school_detail)
    let SchoolResposne = await SchoolDetails.findOne({ where: { school_code: Sq.where(Sq.fn("LOWER", Sq.col('school_code')), school_detail.school_code.toLowerCase()) } })
    if (SchoolResposne) {
        return res.json({
            status: 400,
            success: false,
            message: "The school code is already exists in the BSS system. Please register with a different school code!"
        })
    };

      const UserRes = await Users.findOne({ where: { email: school_detail.email } })

    if (UserRes) {
        return res.json({
            status: 400,
            success: false,
            message: "The boarding head email is already exists in the BSS system. Please register with a different email address!"
        });
    };

    const transactionInstance = await sequelize.transaction();
    
    await SchoolDetails.create(school_detail, { transaction: transactionInstance }).then(async (response) => {

        school_detail.school_detail_id = response.school_detail_id;
        school_detail.school_detail_uuid = response.school_detail_uuid;

        let bcryptedPassword = await bcrypt.hash(school_detail.password, 10);
        let user_detail = {
            school_detail_id: school_detail.school_detail_id,
            school_code: school_detail.school_code,
            country_host: school_detail.country_host,
            first_name: school_detail.first_name,
            last_name: school_detail.last_name,
            email: school_detail.email,
            password: bcryptedPassword,
            original_password: school_detail.password,
            avatar: school_detail.avatar,
            role_type: 2,
            contact_one: school_detail.contact_one,
            contact_two: school_detail.contact_two
        }
        await Users.create(user_detail, { transaction: transactionInstance }).then(async (userResponse) => {

            school_detail.user_uuid = userResponse.user_uuid;
            school_detail.user_id = userResponse.user_id

            await CreateOrUpdateSchoolDatabase(school_detail).then(async (newDatabaseResponse) => {

                //config the new db and sync the model//
                let school_db_details = {
                    school_code: school_detail.school_code,
                    country_host: school_detail.country_host
                }
                //sync the database models
                await configNewDb(school_db_details);

                /***************Send  Email To School User**************/

                let email_parametars = {
                    user_name: `${school_detail.first_name} ${school_detail.last_name}`,
                    user_email: `${school_detail.email}`,
                    user_password: school_detail.password,
                    APP_URL: process.env.APP_URL,
                    login_link: `${process.env.APP_BUILD_URL}/`,
                };

                let email_template = fs.readFileSync(`${appRoot}/src/Services/Views/email-templates/SchoolUser.html`, "utf8");

                email_template = email_template.replace(/user_name|user_email|user_password|APP_URL|login_link/gi, function (matched) {
                    return email_parametars[matched];
                });

                let mail_options = {
                    html: email_template,
                    to: school_detail.email,
                    from: process.env.MAIL_FROM_ADDRESS,
                    subject: "BSS -School User Registration",
                };
                SendEmail(mail_options)
                    .then(async (info) => {
                        console.log("School User login SendEmail info------------", info);
                    })
                    .catch((error) => {
                        console.log("School User login SendEmail error------------", error);
                    });

                /******************End Send  Email To School User**************/
                await transactionInstance.commit();

                return res.json({
                    status: 200,
                    success: true,
                    message: "School created successfully!"
                })

            }).catch(async (error) => {
                // await transactionInstance.rollback()
               
                return res.json({
                    status: 400,
                    success: false,
                    error: error,
                    message: "Something went wrong. Please try again or reach out to support if the issue persists."
                })
            })
        }).catch(async (error) => {
            // await transactionInstance.rollback()
           
            console.log(error)
            return res.json({
                status: 400,
                success: false,
                error: error,
                message: "Something went wrong. Please try again or reach out to support if the issue persists."
            })
        })
    }).catch(async (error) => {
        // await transactionInstance.rollback()
        // let school_db_details = {
        //     school_code: school_detail.school_code,
        //     drop_database: true
        // }
        // setTimeout(async function () {
        //     await CreateOrUpdateSchoolDatabase(school_db_details)
        // }, 1000);
       
        console.log(error)
        return res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })
    })
}

module.exports.DeactivateSchool = async (req, res) => {
    const { school_detail_uuid, is_school_activate } = req.body;
    //  const {db}=req.query;
    if (school_detail_uuid && is_school_activate) {
        SchoolDetails.update({ is_school_activate }, { where: { school_detail_uuid }, returning: true, raw: true }).then(async (response) => {
            try {
                let { school_code, country_host } = response[1][0];

                //update the user school database table
                const BssSchoolDetailsModel = await BssSchoolDetails(await configNewDb({ school_code, country_host,sync_db: false }))
                await BssSchoolDetailsModel.update({ is_school_activate }, { where: { school_detail_uuid: school_detail_uuid }, returning: true, raw: true })

            } catch (error) {
                console.log(error);
                return res.json({
                    status: 400,
                    success: false,
                    error: error,
                    message: "Something went wrong. Please try again or reach out to support if the issue persists."
                })
            }
            return res.json({
                status: 200,
                success: true,
                message: `School ${is_school_activate === true || is_school_activate === "true" ? 'Activated' : "Deactivated"} successfully!`

            })

        }).catch((error) => {
            console.log(error)
            res.json({
                status: 400,
                success: false,
                error: error,
                message: "Something went wrong. Please try again or reach out to support if the issue persists."
            })
        })
    } else {
        res.json({
            status: 400,
            success: false,
            message: "Bad Request !"
        })
    }
}
module.exports.GetAllSchools = async (req, res) => {
    const { page, limit, order, sort, search, is_school_activate } = req.query;
    let query_object = {};
    let where_object = {};

    if (page && limit) {
        query_object = {
            ...query_object,
            offset: 0 + (page - 1) * limit,
            limit: limit
        }
    }

    if (sort && order) {
        query_object = {
            ...query_object,
            order: [[sort, order]]
        }
    }

    if (is_school_activate === true || is_school_activate === "true") {
        where_object = {
            is_school_activate: true
        }
    }
    if (is_school_activate === "false" || is_school_activate === false) {
        where_object = {
            is_school_activate: false
        }
    }

    if (search) {
        where_object = {
            ...where_object,
            school_name: Sq.where(Sq.fn('LOWER', Sq.col('school_name')), { [Sq.Op.iLike]: `%${search.toLowerCase()}%` })
        }
    }
    SchoolDetails.findAndCountAll({
        where: where_object, include: [{
            model: Users, as: "admin_user", where: { role_type: 2 }
        },
        {
           model:BssSubscription,as:"subscriptionData"
        },
        ],
        ...query_object
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get all schools details successfully!"
        })

    }).catch((error) => {
        console.log(error)
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })
    })
}
module.exports.GetSchoolById = async (req, res) => {
    const { school_detail_uuid } = req.query;
    SchoolDetails.findOne({
        where: { school_detail_uuid },
        include: { model: Users, as: "admin_user", where: { role_type: 2 } }

    }).then(async (response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get school detail successfully!"
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
}

module.exports.UpdateSchool = async (req, res) => {

    const login_user = req.login_user;
    const school_details = req.body;
    const school_detail_uuid = school_details.school_detail_uuid;
    delete school_details.school_detail_uuid;

    if (typeof req?.file !== "undefined" && req?.file?.path) {

        school_details.school_logo = req.file.path;
    }

    if (typeof req?.file !== "undefined" && req?.file?.path) {
        let schoolDetailResponse = await SchoolDetails.findOne({ where: { school_detail_uuid } })

        if (schoolDetailResponse?.school_logo) {

            let filePath = `${appRoot}/${schoolDetailResponse?.school_logo}`;
            await DeleteFile(filePath)
        }
    }

    SchoolDetails.update(school_details, { where: { school_detail_uuid }, returning: true, raw: true }).then(async (response) => {

        try {
            let { school_code, country_host } = response[1][0];

            const BssSchoolDetailsModel = await BssSchoolDetails(await configNewDb({ school_code, country_host,sync_db: false}))
            await BssSchoolDetailsModel.update(school_details, { where: { school_detail_uuid: school_detail_uuid }, returning: true, raw: true })

            return res.json({
                status: 200,
                success: true,
                data: req.login_user,
                message: "School details updated successfully!"
            })
        } catch (error) {
            console.log(error);
            return res.json({
                status: 400,
                success: false,
                error: error,
                message: "Something went wrong. Please try again or reach out to support if the issue persists."
            })
        }
    }).catch((error) => {
        console.log(error)
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })

    })
}
//delete bulk user and uploads pending
// module.exports.DeleteSchoolAndDatabase = async (req, res) => {
//     const school_details = req.body;
//     school_details.drop_database = true;

//     await CreateOrUpdateSchoolDatabase(school_details).then(async (response) => {
//         try {
//             let schoolDetailResponse = await SchoolDetails.destroy({ where: { school_detail_uuid: school_details.school_detail_uuid } })

//             let usersResponse = await Users.destroy({ where: { school_code: school_details.school_code } })

//             res.json({
//                 status: 200,
//                 success: true,
//                 message: "School deleted successfully"

//             })
//         } catch (error) {

//             console.log(error)
//             res.json({
//                 status: 400,
//                 success: false,
//                 error: error,
//                 message: "Something went wrong,Please try again"
//             })
//         }

//     }).catch((error) => {
//         console.log(error)
//         res.json({
//             status: 400,
//             success: false,
//             error: error,
//             message: "Something went wrong,Please try again!"

//         })
//     })
// }



module.exports.createUserSubscription =async(req,res)=>{
    const login_user =req.login_user
    const config_sequelize =req.config_sequelize
    const subscriptionDetails =req.body
    subscriptionDetails.created_by= login_user.user_id

    BssSubscription.create(subscriptionDetails).then((response)=>{
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