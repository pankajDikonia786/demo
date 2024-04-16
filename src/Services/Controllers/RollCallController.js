const fs = require("fs");
const Sq = require("sequelize");
const { DateTime, } = require("luxon");
const PDFDocument = require("pdfkit-table");
const { DeleteFile, SystemLogsFun } = require("../../libs/Helper")
const { BssStudents, BssDormitories, BssOnCampusLocations, BssReasons, BssStudentAttendance,
    BssUsers, BssAttendanceUsers, BssStuReasonOncampus, BssStuCurrrentLocation,
    BssStudentAllergy, BssStudentGrounded, BssStudentGeneric,BssAttendanceDiscarded,BssStuLocChangeNotifications } = require("../Models/common")


module.exports.GetAllStudentsforConductRollCall = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user =req.login_user
    const { page, limit, sort, order, gender} = req.query;
    let {dormitory_ids,class_ids}=req.query
    let where_data = { is_student_activate: true };
    let query_data = {};

    dormitory_ids =JSON.parse(dormitory_ids)
    class_ids =JSON.parse(class_ids)

     /*** Permission Access Start(default) ***/
     if (login_user.role_type > 2) {
        const permisssionRes = await BssPermissionDetailsModel.findOne({
            where: { user_id: login_user.user_id },
            include: { model: BssPermissionClassDormModel, as: "perm_class_dorm" }
        });
        const permissonClassDom = permisssionRes.perm_class_dorm;
        if (permissonClassDom && permissonClassDom.length > 0) {

            let dorm_ids = [];
            let class_ids = [];
            permissonClassDom.forEach((perm_value) => {
                perm_value.dormitory_id ? dorm_ids.push(perm_value.dormitory_id) : "";
                perm_value.class_id ? class_ids.push(perm_value.class_id) : ""
            });
            if (dorm_ids && dorm_ids.length > 0) {
                where_data = {
                    dormitory_id: { [Sq.Op.or]: dorm_ids }
                }
            };
            if (class_ids && class_ids.length > 0) {
                where_data = {
                    ...where_data,
                    class_id: { [Sq.Op.or]: class_ids }
                }
            };
            if (permisssionRes.snapshot_gender_male || permisssionRes.snapshot_gender_male == true) {
                where_data = {
                    ...where_data,
                    gender: "male",
                };
            };
            if (permisssionRes.snapshot_gender_female || permisssionRes.snapshot_gender_female == true) {
                where_data = {
                    ...where_data,
                    gender: "female",
                };
            };
        };
    };

    /*** Permission Access End ***/

    if (gender) {
        where_data = {
            ...where_data,
            gender: gender
        }
    }

    // if(dormitory_ids.length>0){
    if (dormitory_ids) {
        where_data = {
            ...where_data,
            dormitory_id: dormitory_ids
        }
    };
// }
    if (class_ids) {
        where_data = {
            ...where_data,
            class_id: class_ids
        }

    };

    if (page && limit) {

        query_data.offset = 0 + (page - 1) * limit;
        query_data.limit = limit;

    };
    if (sort && order) {

        query_data.order = [[sort, order]]

    };

    const BssStudentsModel = await BssStudents(await config_sequelize);
    const BssDormitoriesModel = await BssDormitories(config_sequelize);
    const BssStudentAttendanceModel = await BssStudentAttendance(config_sequelize);
    const BssOnCampusLocationsModel = await BssOnCampusLocations(config_sequelize);
    const BssReasonsModel = await BssReasons(config_sequelize);
    const BssStuReasonOncampusModel = await BssStuReasonOncampus(config_sequelize);
    const BssStuCurrrentLocationModel = await BssStuCurrrentLocation(config_sequelize);
    const BssStudentAllergyModel = await BssStudentAllergy(config_sequelize);
    const BssStudentGroundedModel = await BssStudentGrounded(config_sequelize);
    const BssStudentGenericModel = await BssStudentGeneric(config_sequelize);


    // Make relation here
    BssStudentsModel.hasMany(BssStudentGroundedModel, {
        as: "grounded_data", foreignKey: "student_id",
        constraints: false, allowNull: true, defaultValue: null
    });

    const studentResponse = BssStudentsModel.findAndCountAll({
        where: where_data, attributes:
            [[Sq.fn('PGP_SYM_DECRYPT', Sq.col('unique_pin'), PG_ENCRYPT_KEY), "unique_pin"],
                "student_id", "student_uuid", "student_first_name", "student_last_name", "gender",
                "class_name", "student_avatar"
            ],
        include: [
            {
                model: await BssDormitoriesModel, as: "dormitory_data",
                attributes:
                    ["dormitory_id", [Sq.fn('PGP_SYM_DECRYPT', Sq.col('dormitory_name'), PG_ENCRYPT_KEY), "dormitory_name"]]
            },
            /////Allergic details
            {
                model: BssStudentAllergyModel, as: "allergy_details", attributes: [
                    [Sq.fn('PGP_SYM_DECRYPT', Sq.col('allergy_name'), PG_ENCRYPT_KEY), "allergy_name"],
                    "student_allergy_uuid", "student_allergy_id"]
            },
            /////Gronded details
            {
                model: await BssStudentGroundedModel, as: "grounded_data",
                attributes: ["student_grounded_id", "student_grounded_uuid", "grounded_desc"],
                where: {
                    [Sq.Op.and]: [

                        { grounded_start_date: { [Sq.Op.lte]: DateTime.now().toFormat("yyyy-MM-dd") } },
                        { grounded_end_date: { [Sq.Op.gte]: DateTime.now().toFormat("yyyy-MM-dd") } }
                    ],
                    is_grounded_activate: true
                },
                required: false,
            },
            /////Generic details
            {
                model: await BssStudentGenericModel, as: "generic_data",
                attributes: ["student_generic_id", "student_generic_uuid", "generic_desc"],
                where: {
                    [Sq.Op.and]: [

                        { generic_start_date: { [Sq.Op.lte]: DateTime.now().toFormat("yyyy-MM-dd") } },
                        { generic_end_date: { [Sq.Op.gte]: DateTime.now().toFormat("yyyy-MM-dd") } }
                    ],
                    is_generic_activate: true
                },
                required: false,
            },

            {
                model: BssStuCurrrentLocationModel, as: "current_loc_data",

                attributes: ["stu_current_location_id", "student_id", "reason_id", "on_campus_location_id",
                    "current_present_status"],
                required: false,
                include: [
                    {
                        model: BssOnCampusLocationsModel, as: "current_loc_oncampus",
                        attributes: ["on_campus_location_id", "location_name"],
                        required: false,
                        // separate: true,
                    },
                    {
                        model: BssReasonsModel, as: "reasons_data",
                        as: "current_loc_reason",
                        attributes: ["reason_name"],
                        required: false,
                        // separate: true,
                    }
                ]
            },
            {
                model: BssStuReasonOncampusModel, as: "campus_or_reasons_data",
                attributes: ["stu_reason_oncampus_id","reason_id"],
                  limit: 1,
                order: [["stu_reason_oncampus_id", "desc"]],
                 required: false,
                // include: [{
                //     model: BssReasonsModel, as: "reason_data",
                //     attributes: ["reason_name"],
                //     required: false,
                // }, {
                //     model: BssOnCampusLocationsModel,
                //     attributes: ["on_campus_location_id", "location_name"],
                //     required: false,
                // }]
            },
             // Get attendance history
           {
            model: BssStudentAttendanceModel, as: "stu_atten_details",
            order: [["created_date", "desc"]],
            // where: { is_latest: false, },
            limit: 5,
            // separate: true,
            required: false,
            attributes: ["student_attendance_id", "is_latest", "is_attendance"],

            include: [{
                model: BssReasonsModel, as: "attendance_reason",
                attributes: ["reason_name"],
                required: false,
                separate: true

            },]
        },

        ],
        ...query_data,
        distinct: true,
        hooks: false
    });
    const reasonDataRes = BssReasonsModel.findAll({ attributes: ["reason_id", "reason_uuid", "reason_name"] });

    Promise.all([studentResponse, reasonDataRes,]).then((responseValues) => {
        res.json({
            status: 200,
            success: true,
            data: {...responseValues[0],reason_data: responseValues[1]},
            message: "Get all Students for Roll Call successfully!"
        });
       
    }).catch((error) => {
        console.log(error);
        return res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })

    });

};

module.exports.GetAllReasonsAndCampusLocations = async (req, res) => {
    const config_sequelize = req.config_sequelize;

    const BssReasonsModel = await BssReasons(config_sequelize);
    const BssOnCampusLocationsModel = await BssOnCampusLocations(config_sequelize);

    const reasonDataRes = BssReasonsModel.findAll({ attributes: ["reason_id", "reason_uuid", "reason_name"] })
    const onCampusLocationDataRes = BssOnCampusLocationsModel.findAll({
        where: { is_on_campus_activate: true },
        attributes: ["on_campus_location_uuid", "on_campus_location_id", "location_name"]
    });

    Promise.all([reasonDataRes, onCampusLocationDataRes]).then((responseValues) => {
        res.json({
            status: 200,
            success: true,
            data: { reason_data: responseValues[0], campus_locations_data: responseValues[1] },
            message: "Get all Reasons and Campus Locations successfully!"
        });
    }).catch((error) => {
        console.log(error);
        return res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });

    });
};

module.exports.CreateStudentsConductRollCall = async (req, res) => {

    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const timezone = login_user.user_school.timezone;

    let { attendance_title, rollcall_data: attendance_details } = req.body;

    const BssStudentAttendanceModel = await BssStudentAttendance(config_sequelize);
    const BssStudentsModel = await BssStudents(config_sequelize);
    const BssAttendanceUsersModel = await BssAttendanceUsers(config_sequelize);
    const BssStuReasonOncampusModel = await BssStuReasonOncampus(config_sequelize);
    const BssStuCurrrentLocationModel = await BssStuCurrrentLocation(config_sequelize);
    const BssStuLocChangeNotificationsModel = await BssStuLocChangeNotifications(config_sequelize);
    const BssUsersModel = await BssUsers(config_sequelize);

    attendance_details = JSON.parse(attendance_details);
    try {

        if (attendance_details.length > 0) {
            //array for update the student attendace status
            let student_ids = [];
             let student_loc_changed_ids = [];
            let student_loc_not_changed_ids = [];
            //array for update the snapshot student oncampus or reasons status
            let create_stu_reason_oncampus = [];
            let stu_reason_oncampus_ids = [];
            let stu_loc_changed_notification = [];
            let stu_send_notification_data = [];

            config_sequelize.transaction(async (transactionInstance) => {
                //created by attendance user(manager)
                let attendanceUser = await BssAttendanceUsersModel.create({
                    user_id: login_user.user_id, duration_time: attendance_details[0].duration_time,
                    attendance_title
                },
                    { transaction: transactionInstance });

                attendance_details.forEach(async (atten_value, atten_index) => {

                    attendance_details[atten_index].attendance_user_id = attendanceUser.attendance_user_id
                    attendance_details[atten_index].created_by = login_user.user_id;
                    student_ids.push(atten_value.student_id);

                     //student id that location not changed 
                    if (atten_value.is_loc_changed === false || atten_value.is_loc_changed === "false") {
                        student_loc_not_changed_ids.push(atten_value.student_id);

                    };
                    //student id that location changed 
                    if (atten_value.is_loc_changed === true || atten_value.is_loc_changed === "true") {
                        student_loc_changed_ids.push(atten_value.student_id);
                    };

                    //create new array sign in to reason locations(snapshot)
                    if (atten_value.reason_id) {
                        create_stu_reason_oncampus.push({
                            sign_in_out_status: 1,
                            reason_id: atten_value.reason_id,
                            student_id: atten_value.student_id,
                            sign_in_date: Date.now(),
                            created_by: login_user.user_id
                        });

                    };
                    //data array sign out from reasons (snapshot)
                     if (atten_value.stu_reason_oncampus_id && !atten_value.reason_id || atten_value.reason_id == null) {
                    
                        stu_reason_oncampus_ids.push(atten_value.stu_reason_oncampus_id)
                    };
                    // create or update student current location only
                    await BssStuCurrrentLocationModel.upsert({
                        student_id: atten_value.student_id,
                        reason_id: atten_value.reason_id,
                        on_campus_location_id: null,
                         // on_campus_location_id: atten_value.on_campus_location_id,
                        current_present_status: atten_value.is_attendance,
                        is_loc_changed: atten_value.is_loc_changed
                    }, { transaction: transactionInstance });
                    // change loc notifications data
                    if (atten_value.is_loc_changed && atten_value.stu_current_loc_name.toLowerCase() == "mia") {
                        stu_loc_changed_notification.push({
                            student_id: atten_value.student_id,
                            attendance_user_id: attendanceUser.attendance_user_id,
                            stu_current_loc_name: atten_value.stu_current_loc_name,
                        });
                        //send (socket io) notification details
                        stu_send_notification_data.push({
                            student_first_name: atten_value.student_first_name,
                            student_last_name: atten_value.student_last_name,
                            dormitory_name: atten_value.dormitory_name,
                            user_name: login_user.first_name + " " + login_user.last_name,
                            attendance_title,
                            stu_current_loc_name: atten_value.stu_current_loc_name,
                            created_date: DateTime.now().setZone(timezone),
                              school_code: login_user.school_code
                        })
                    };
                });
                //update previous attendance latest status
                await BssStudentAttendanceModel.update({ is_latest: false, }, {
                    where: {
                        is_latest: true, student_id: { [Sq.Op.in]: student_ids }
                    }, transaction: transactionInstance
                });
                //create attendance
                await BssStudentAttendanceModel.bulkCreate(attendance_details,
                    { transaction: transactionInstance });

                // update reason oncampus(Snapshot) previous status when present
                if (stu_reason_oncampus_ids.length > 0) {
                    await BssStuReasonOncampusModel.update({
                        sign_in_out_status: 2, sign_out_date: Date.now(),
                        updated_by: login_user.user_id
                    }, {
                        where: {
                            stu_reason_oncampus_id: stu_reason_oncampus_ids
                        }, transaction: transactionInstance
                    });
                };
                
                //create reason oncampus(Snapshot) table data
                if (create_stu_reason_oncampus) {
                    await BssStuReasonOncampusModel.bulkCreate(create_stu_reason_oncampus, {
                        transaction: transactionInstance
                    });
                };
             
                //update snapshot comapre rollcall status of students(when same as snapshot)
                if (student_loc_not_changed_ids && student_loc_not_changed_ids.length > 0) {
                    await BssStudentsModel.update({ rollcall_compare_status: false }, { where: { student_id: student_loc_not_changed_ids } });

                };
                //update snapshot comapre rollcall status of students(when is_location_changed true)
                if (student_loc_changed_ids && student_loc_changed_ids.length > 0) {
                    await BssStudentsModel.update({ rollcall_compare_status: true }, { where: { student_id: student_loc_changed_ids } });

                };
                //create notifications details
                if (stu_loc_changed_notification) {
                    let userNotificationArray = [];
                    const userRes = await BssUsersModel.findAll({
                        where: { is_user_activate: true }, raw: true, attributes: ["user_id"]
                    });
                    if (userRes) {
                        stu_loc_changed_notification.forEach((notiVal, notiInd) => {

                            userRes.forEach((userVal,) => {
                                userNotificationArray.push({
                                    student_id: stu_loc_changed_notification[notiInd].student_id,
                                    user_id: userVal.user_id,
                                    attendance_user_id: stu_loc_changed_notification[notiInd].attendance_user_id,
                                    stu_current_loc_name: stu_loc_changed_notification[notiInd].stu_current_loc_name,
                                    created_by: login_user.user_id
                                });
                            });
                            //send notifications (socket io)
                            socketIO.emit("new-notification", stu_send_notification_data[notiInd]);
                            // socketIO.in(login_user.school_code).emit('new-notification', stu_send_notification_data[notiInd]);
                        });
                        await BssStuLocChangeNotificationsModel.bulkCreate(userNotificationArray, {
                            transaction: transactionInstance
                        });
                    };
                };
                res.json({
                    status: 200,
                    success: true,
                    message: "Students Conduct Roll Call successfully!"
                });
            });
        } else {
            res.json({
                status: 400,
                success: false,
                message: "Bad Request!"
            })
        }
    } catch (error) {

        console.log(error);
        return res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })

    }
};

module.exports.GetStudentsRollCallReport = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    // const { timezone } = login_user.user_school;
    let { class_id, attendance_date, dormitory_id, user_id, gender } = req.query;

    let students_where_data = {};
    let where_data = {};

    if (attendance_date) {
        start_date = DateTime.fromFormat(attendance_date, "yyyy-MM-dd").startOf('day').toUTC().toISO();
        end_date = DateTime.fromFormat(attendance_date, "yyyy-MM-dd").endOf('day').toUTC().toISO();
        where_data = {
            created_date: {
                [Sq.Op.and]: {
                    [Sq.Op.gte]: start_date,
                    [Sq.Op.lte]: end_date
                }
            }
        }
    }
    if (user_id) {
        where_data = {
            ...where_data,
            user_id: user_id
        }

    }
    if (gender) {
        students_where_data = {
            ...students_where_data,
            gender: gender
        }

    }
    if (class_id) {
        students_where_data = {
            ...students_where_data,
            class_id: class_id
        }
    };
    if (dormitory_id) {
        students_where_data = {
            ...students_where_data,
            dormitory_id: dormitory_id
        }
    };

    const BssAttendanceUsersModel = await BssAttendanceUsers(await config_sequelize);
    const BssStudentsModel = await BssStudents(await config_sequelize);
    const BssStudentAttendanceModel = await BssStudentAttendance(config_sequelize);
    // const BssOnCampusLocationsModel = await BssOnCampusLocations(config_sequelize);
    const BssReasonsModel = await BssReasons(config_sequelize);
    const BssUsersModel = await BssUsers(config_sequelize);
    const BssDormitoriesModel =await BssDormitories(config_sequelize)

    //Make relation at here
    BssStudentAttendanceModel.hasOne(await BssStudentsModel, {
        as: "atten_student", foreignKey: "student_id", sourceKey: "student_id"
    })

    BssAttendanceUsersModel.findAll({
        where: where_data,
        attributes: ["created_date", "attendance_title"
            // [Sq.literal(`"bss_attendance_users"."created_date"::timestamptz AT TIME ZONE '${timezone}'`), 'atten_date'],
        ],
        include: [
            {
                model: BssUsersModel,
                as: "attend_user",
                attributes: ["first_name", "last_name", "user_id"],
                required: false,
            },
            {
                model: BssStudentAttendanceModel, as: "atten_data",
                attributes: ["student_attendance_id", "is_latest", "is_attendance"],
                required: true,
                include: [
                    {
                        model: BssStudentsModel,
                        as: "atten_student",
                        where: students_where_data,
                        attributes:
                            [[Sq.fn('PGP_SYM_DECRYPT', Sq.col('unique_pin'), PG_ENCRYPT_KEY), "unique_pin"],
                                "student_id", "student_uuid", "student_first_name", "student_last_name", "gender",
                                "class_name",],

                        required: true,

                        include:[{
                            model: BssDormitoriesModel, as: "dormitory_data",
                           attributes: [[Sq.fn('PGP_SYM_DECRYPT', Sq.col('dormitory_name'), PG_ENCRYPT_KEY), "dormitory_name"],
                          "dormitory_uuid"]

                        }]
                    },
                    {
                        model: BssReasonsModel, as: "attendance_reason",
                        attributes: ["reason_name"],
                        required: false,
                    },
                    // {
                    //     model: BssOnCampusLocationsModel,
                    //     as: "attendance_oncampus",
                    //     attributes: ["on_campus_location_id", "location_name"],

                    //     required: false,
                    // },

                ]
            },

        ],

        order: [
            ["created_date", "desc"],
            [{ model: BssStudentAttendanceModel, as: "atten_data" }, "student_id", "ASC"]
        ],

        hooks: false
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get all Students for Roll Call successfully!"
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

module.exports.ExportStudentsAttendancePdf = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const { timezone, school_code } = login_user.user_school;
    let { class_id, attendance_date, dormitory_id, user_id, gender } = req.query;

    let students_where_data = {};
    let where_data = {};

    if (attendance_date) {
        start_date = DateTime.fromFormat(attendance_date, "yyyy-MM-dd").startOf('day').toUTC().toISO();
        end_date = DateTime.fromFormat(attendance_date, "yyyy-MM-dd").endOf('day').toUTC().toISO();
        where_data = {
            created_date: {
                [Sq.Op.and]: {
                    [Sq.Op.gte]: start_date,
                    [Sq.Op.lte]: end_date
                }
            }
        }
    }
    if (user_id) {
        where_data = {
            ...where_data,
            user_id: user_id
        }

    }
    if (gender) {
        students_where_data = {
            ...students_where_data,
            gender: gender
        }

    }
    if (class_id) {
        students_where_data = {
            ...students_where_data,
            class_id: class_id
        }
    };
    if (dormitory_id) {
        students_where_data = {
            ...students_where_data,
            dormitory_id: dormitory_id
        }
    };

    const BssAttendanceUsersModel = await BssAttendanceUsers(await config_sequelize);
    const BssStudentsModel = await BssStudents(await config_sequelize);
    const BssStudentAttendanceModel = await BssStudentAttendance(config_sequelize);
    // const BssOnCampusLocationsModel = await BssOnCampusLocations(config_sequelize);
    const BssReasonsModel = await BssReasons(config_sequelize);
    const BssUsersModel = await BssUsers(config_sequelize);

    //Make relation at here
    BssStudentAttendanceModel.hasOne(await BssStudentsModel, {
        as: "atten_student", foreignKey: "student_id", sourceKey: "student_id"
    })

    BssAttendanceUsersModel.findAll({
        where: where_data,
        attributes: ["created_date"
            // [Sq.literal(`"bss_attendance_users"."created_date"::timestamptz AT TIME ZONE '${timezone}'`), 'atten_date'],
        ],
        include: [
            {
                model: BssUsersModel,
                as: "attend_user",
                attributes: ["first_name", "last_name", "user_id"],
                required: false,
            },
            {
                model: BssStudentAttendanceModel, as: "atten_data",
                attributes: ["student_attendance_id", "is_latest", "is_attendance"],
                required: true,
                include: [
                    {
                        model: BssStudentsModel,
                        as: "atten_student",
                        where: students_where_data,
                        attributes:
                            [[Sq.fn('PGP_SYM_DECRYPT', Sq.col('unique_pin'), PG_ENCRYPT_KEY), "unique_pin"],
                                "student_id", "student_uuid", "student_first_name", "student_last_name", "gender",
                                "class_name",],

                        required: true,
                    },
                    {
                        model: BssReasonsModel, as: "attendance_reason",
                        attributes: ["reason_name"],
                        required: false,
                    },
               
                ]
            },

        ],

        order: [
            ["created_date", "desc"],
            [{ model: BssStudentAttendanceModel, as: "atten_data" }, "student_id", "ASC"]
        ],

        hooks: false
    }).then((response) => {

        const todayDate = DateTime.now().setZone(timezone).toFormat(('MM-dd-yyyy'))
        let file_name = `Export-StudentsAttendancePdf-${new Date().getTime()}.pdf`;
        let uploadFilePath = `uploads/${school_code}/${file_name}`;
        const createPdfFile = fs.createWriteStream(uploadFilePath);
        // init document
        let doc = new PDFDocument({ margin: 24, size: 'A4' });
        // save document
        doc.pipe(createPdfFile);

        let attentDataArr = [];

        ///////Pdf Header create////////  
        let table_title = {

            headers: [
                { label: `Date:- ${todayDate}`, width: 123, headerColor: "white", },
                { label: "Attendance Report", fontSize: 18, valign: "center", headerAlign: "center", align: "center", width: 302, headerColor: "white", }
                , { label: `Class:All`, width: 123, align: "right", headerAlign: "right", headerColor: "white", }
            ],

        }
        doc.table(table_title,
            {
                padding: 3,
                prepareHeader: () => doc.font("Helvetica-Bold").fontSize(13),
            });

        /////////start data pdf data row inputs
        response.forEach(async (atten_value, atten_ind, atten_arr) => {
            let atten_date = new Date(atten_value.dataValues.created_date)
            atten_date = atten_date.toISOString()
            attentDataArr.push({
                atten_created: DateTime.fromISO(atten_date).setZone(timezone).toFormat('HH:mm a'),
                user_name:
                    atten_value.dataValues.attend_user?.first_name + " " + atten_value.dataValues.attend_user?.last_name
                , student_data: []
            })
            atten_value.atten_data.forEach((stu_val) => {
              
                attentDataArr[atten_ind].student_data.push({
                    atten_info: stu_val.attendance_reason[0]? `${stu_val.atten_info}(${stu_val.attendance_reason[0]?.reason_name})` : stu_val.atten_info,
                    is_attendance: stu_val.is_attendance,
                    unique_pin: stu_val.atten_student.unique_pin, student_name:
                        stu_val.atten_student.student_first_name + " " + stu_val.atten_student.student_last_name,
                    gender: stu_val.atten_student.gender, class_name: stu_val.atten_student.class_name ? stu_val.atten_student.class_name : ""
                })
            })

            let table = {
                subtitle: `Roll Call Conduct By ${attentDataArr[atten_ind].user_name} (${attentDataArr[atten_ind].atten_created})`,
                headers: [
                    { label: "Roll No", property: 'unique_pin', width: 120, renderer: null, },
                    { label: "Name", property: 'student_name', width: 160, renderer: null },
                    { label: "Class", property: 'class_name', width: 70, renderer: null },
                    { label: "Gender", property: 'gender', width: 98, renderer: null },
                    { label: "Attendance", property: 'atten_info', valign: "right", headerAlign: "right", align: "right", width: 100, renderer: null },
                    ,
                ],
                datas: [...attentDataArr[atten_ind].student_data], // complex data
                rows: [],
            };
            // doc.addPage()
            doc.table(table, {
                padding: 3,
                prepareHeader: () => doc.font("Helvetica-Bold").fontSize(11),

            });
            if (doc.y > 0.8 * doc.page.height) {
                doc.addPage()
            }

            doc.moveDown(); // move to down // separate tables
        })

        doc.end();
        res.json({
            status: 200,
            success: true,
            response: attentDataArr,
            file: process.env.APP_URL + "/" + uploadFilePath,
            message: "Student's Attendance Pdf Exported Successfully!",
        });

        // Delete the file after 10 seconds
        setTimeout(async () => {
            let filePath = `${appRoot}/${uploadFilePath}`;
            await DeleteFile(filePath)
        }, "20000");

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

module.exports.CreateRollCallSessionDiscard = async (req, res) => {
    try {
        const login_user = req.login_user;
        const config_sequelize = req.config_sequelize;
        const sessionDiscardDetails = req.body;
        sessionDiscardDetails.created_by = login_user.user_id;


        const BssAttendanceDiscardedModel = await BssAttendanceDiscarded(config_sequelize);
       await BssAttendanceDiscardedModel.create(sessionDiscardDetails);
        let sys_obj ={
            user_id:login_user.user_id,
            action:"created",
            html_info:`The roll-call session <strong> ${sessionDiscardDetails.attendance_title} & time_slot [${sessionDiscardDetails.alloted_time_limit} minutes] </strong> was discarded by ${login_user.first_name} ${login_user.last_name} !`
        }
        SystemLogsFun(sys_obj,config_sequelize)

        console.log(sessionDiscardDetails)
        res.json({
            status: 200,
            success: true,
            message: "Roll Call session discarded successfully!"
        });

    } catch (error) {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })
    };
};



