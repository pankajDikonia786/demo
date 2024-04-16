const fs = require("fs");
const Sq = require("sequelize");
const { DateTime } = require("luxon");
const PDFDocument = require("pdfkit-table");
const { DeleteFile } = require("../../libs/Helper")
const { BssDormitories, BssStudentAllergy, BssStudents, BssStudentGeneric, BssStudentGrounded,
    BssStuReasonOncampus, BssParents, BssUsers, BssDiaryComments, BssReasons, BssOnCampusLocations,BssClasses,
    BssStudentAttendance,BssPermissionClassDorm,BssPermissionDetails, BssStuCurrrentLocation,BssStuLocChangeNotifications} = require("../Models/common");
    
module.exports.GetAllSnapshotStudents = async (req, res) => {

    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    let { page, limit, sort, order, gender, dormitory_id, class_id, is_student_activate, oncampus_ids, reason_id, location_status, 
    rollcall_compare_status,is_compare_rollcall_required } = req.query;
    console.log(req.query)

    const BssStudentsModel = await BssStudents(config_sequelize);
    const BssDormitoriesModel = await BssDormitories(config_sequelize);
    const BssStudentAllergyModel = await BssStudentAllergy(config_sequelize);
    const BssStudentGroundedModel = await BssStudentGrounded(config_sequelize);
    const BssStudentGenericModel = await BssStudentGeneric(config_sequelize);
    const BssStuReasonOncampusModel = await BssStuReasonOncampus(config_sequelize);
    const BssOnCampusLocationsModel = await BssOnCampusLocations(config_sequelize);
    const BssReasonsModel = await BssReasons(config_sequelize);
    const BssStudentAttendanceModel = await BssStudentAttendance(config_sequelize);
    const BssStuCurrrentLocationModel = await BssStuCurrrentLocation(config_sequelize);
    const BssPermissionClassDormModel = await BssPermissionClassDorm(config_sequelize);
    const BssPermissionDetailsModel = await BssPermissionDetails(config_sequelize);

    let where_data = { is_student_activate: true };
    let stu_loc_where_data = {};
    let query_data = {};
    let required_status = false;

    /*** Permission Access Start(default) ***/
    if (!class_id && !dormitory_id && !gender && login_user.role_type > 2) {
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

    //if oncampus data filter applied then get all campus locations 
    // with reason (only oncampus reason)
    if (location_status === "oncampus" && oncampus_ids && reason_id) {
        oncampus_ids = JSON.parse(oncampus_ids);
        stu_loc_where_data = {
            [Sq.Op.or]: [
                { on_campus_location_id: { [Sq.Op.in]: oncampus_ids }, },
                { reason_id: reason_id, }
            ]
        };
        required_status = true;
    };

    if (location_status === "knownlocation" && reason_id) {
        stu_loc_where_data = { reason_id: reason_id };
        required_status = true;
    };

    if (location_status === "mia" && reason_id) {
        stu_loc_where_data = { reason_id: reason_id };
        required_status = true;
    };
    if (location_status === "sickleave" && reason_id) {
        stu_loc_where_data = { reason_id: reason_id };
        required_status = true;
    };

    if (location_status === "present") {
        stu_loc_where_data = { current_present_status: true }
        required_status = true;
    };

    if (gender) {
        where_data = {
            ...where_data,
            gender: gender,
        };
    };
    if (dormitory_id) {
        where_data = {
            ...where_data,
            dormitory_id: dormitory_id
        };
    };
    if (is_student_activate === "true" || is_student_activate === true) {
        where_data = {
            ...where_data,
            is_student_activate: true
        };
    };
    if (is_student_activate === "false" || is_student_activate === false) {
        where_data = {
            ...where_data,
            is_student_activate: false
        };
    };
    if (class_id) {
        where_data = {
            ...where_data,
            class_id: class_id
        };
    };
if (is_compare_rollcall_required === true || is_compare_rollcall_required === "true") {
    if (rollcall_compare_status === false || rollcall_compare_status === "false") {
        where_data = {
            ...where_data,
            rollcall_compare_status
        };
    };
    if (rollcall_compare_status === true || rollcall_compare_status === "true") {
        where_data = {
            ...where_data,
            rollcall_compare_status
        };
    };
};
    if (page && limit) {
        query_data.offset = 0 + (page - 1) * limit;
        query_data.limit = limit;
    };
    if (sort && order) {
        query_data.order = [[sort, order]]
    };

    // Make relation here
    BssStudentsModel.hasMany(BssStudentGroundedModel, {
        as: "grounded_data", foreignKey: "student_id",
        constraints: false, allowNull: true, defaultValue: null
    });

    const studentsRes = BssStudentsModel.findAndCountAll({
        where: where_data,
        attributes: ["student_id", "student_uuid", "student_first_name",
            "student_last_name", "student_age", "student_avatar", "gender","rollcall_compare_status",
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('unique_pin'), PG_ENCRYPT_KEY), "unique_pin"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('sporting_house'), PG_ENCRYPT_KEY), "sporting_house"],
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
            /////Grounded details
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
            ////student current location
            {
                model: BssStuCurrrentLocationModel, as: "current_loc_data",
                where: stu_loc_where_data,
                attributes: ["stu_current_location_id", "student_id", "reason_id", "on_campus_location_id",
                    "current_present_status", "is_loc_changed"],
                required: required_status,
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
            ///// reason or oncampus
            {
                model: BssStuReasonOncampusModel, as: "campus_or_reasons_data",
                attributes: ["stu_reason_oncampus_uuid", "stu_reason_oncampus_id", "sign_in_out_status", "on_campus_location_id", "reason_id", "created_date"],
                limit: 2,
                order: [["created_date", "desc"]],

            },
            // Get attendance history
            {
                model: BssStudentAttendanceModel, as: "stu_atten_details",
                order: [["created_date", "desc"]],
                // where: { is_latest: false, },
                limit: 5,
                // separate: true,
                required: false,
                attributes: ["student_attendance_id", "is_latest", "is_attendance", "created_date"],

                include: [{
                    model: BssReasonsModel, as: "attendance_reason",
                    attributes: ["reason_name"],
                    required: false,
                    separate: true

                },]
            },

        ],
        distinct: true,
        ...query_data,
        hooks: false
    })
    const reasonDataRes = await BssReasonsModel.findAll({ attributes: ["reason_id", "reason_uuid", "reason_name"] });

    const oncampusDataRes = await BssOnCampusLocationsModel.findAll({ where: { is_on_campus_activate: true }, attributes: ["on_campus_location_id", "on_campus_location_uuid", "location_name"] });

    Promise.all([studentsRes, reasonDataRes, oncampusDataRes]).then((responseValues) => {
        res.json({
            status: 200,
            success: true,
            data: { ...responseValues[0], reason_data: responseValues[1], oncampus_location_data: responseValues[2] },
            message: "Get all Snapshot Students details successfully!"
        })

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
module.exports.GetAllDormitoryListForSnapshot = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;

    let where_object = { dormitory_status: true };

    /*** Permission Access Start ***/
    if (login_user.role_type > 2) {
        const BssPermissionClassDormModel = await BssPermissionClassDorm(config_sequelize);
        const permissonRes = await BssPermissionClassDormModel.findAll({ where: { user_id: login_user.user_id } })

        if (permissonRes && permissonRes.length > 0) {
            let dorm_ids = [];
            permissonRes.forEach((perm_value) => {
                perm_value.dormitory_id ? dorm_ids.push(perm_value.dormitory_id) : ""
            })
            if (dorm_ids && dorm_ids.length > 0) {
                where_object = {
                    ...where_object,
                    dormitory_id: dorm_ids
                }
            }

        }
    }
    /*** Permission Access End ***/

    const BssDormitoriesModel = await BssDormitories(await config_sequelize);
    await BssDormitoriesModel.findAll({
        where: where_object,
        attributes: ["dormitory_uuid","dormitory_id",[Sq.fn('PGP_SYM_DECRYPT', Sq.col('dormitory_name'), PG_ENCRYPT_KEY), "dormitory_name"],],
        order: [["dormitory_name", "asc"]],
        hooks: false
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get all Snapshot Dormitories List successfully!"
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
};
module.exports.GetAllClassesListForSnapshot = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;

    let where_object = { is_class_activate: true };

    /*** Permission Access Start ***/
    if (login_user.role_type > 2) {
        const BssPermissionClassDormModel = await BssPermissionClassDorm(config_sequelize);
        const permissonRes = await BssPermissionClassDormModel.findAll({ where: { user_id: login_user.user_id } })

        if (permissonRes && permissonRes.length > 0) {

            let class_ids = [];
            permissonRes.forEach((perm_value) => {
                perm_value.class_id ? class_ids.push(perm_value.class_id) : ""
            })
            if (class_ids && class_ids.length > 0) {
                where_object = {
                    ...where_object,
                    class_id: class_ids
                };
            };
        };
    };
    /*** Permission Access End ***/

    const BssClassesModel = await BssClasses(await config_sequelize);
    await BssClassesModel.findAll({
        where: where_object,
        attributes: ["class_name", "class_id", "is_class_activate"],
        order: [["class_no", "asc"]]

    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get all Snapshot Classes List successfully!"
        });

    }).catch((error) => {
        console.log(error)
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });
    });
};



module.exports.SignInStudentReasonOrOncampus = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const timezone = login_user.user_school.timezone;
    const stu_reason_oncampus_details = req.body;

    const { is_loc_changed, stu_current_loc_name, student_first_name,
        student_last_name, dormitory_name } = stu_reason_oncampus_details;
    stu_reason_oncampus_details.created_by = login_user.user_id;
    stu_reason_oncampus_details?.reason_id ? stu_reason_oncampus_details.reason_id : stu_reason_oncampus_details.reason_id = null;
    stu_reason_oncampus_details?.on_campus_location_id ? stu_reason_oncampus_details.on_campus_location_id : stu_reason_oncampus_details.on_campus_location_id = null;

    try {
        const BssStuReasonOncampusModel = await BssStuReasonOncampus(config_sequelize);
        const BssStuCurrrentLocationModel = await BssStuCurrrentLocation(config_sequelize);
        const BssUsersModel = await BssUsers(config_sequelize);
        const BssStuLocChangeNotificationsModel = await BssStuLocChangeNotifications(config_sequelize);
        config_sequelize.transaction(async (transactionInstance) => {

            stu_reason_oncampus_details.sign_in_out_status = 1;
            stu_reason_oncampus_details.sign_in_date = DateTime.now();

            await BssStuReasonOncampusModel.create(stu_reason_oncampus_details,
                { transaction: transactionInstance });

            //Update or create the student current location
            await BssStuCurrrentLocationModel.upsert({
                student_id: stu_reason_oncampus_details?.student_id,
                reason_id: stu_reason_oncampus_details?.reason_id,
                on_campus_location_id: stu_reason_oncampus_details?.on_campus_location_id,
                current_present_status: false
            }, { transaction: transactionInstance });

            //  notifications data
            if (is_loc_changed && stu_current_loc_name.toLowerCase() == "mia") {
                const userRes = await BssUsersModel.findAll({ where: { is_user_activate: true } })
                let stu_loc_changed_notification = [];
                if (userRes) {
                    userRes.forEach((userVal) => {
                        stu_loc_changed_notification.push({
                            student_id: stu_reason_oncampus_details.student_id,
                            stu_current_loc_name: stu_current_loc_name,
                            user_id: userVal.user_id,
                            created_by: login_user.user_id,
                        });
                    });
                    //create notification
                    await BssStuLocChangeNotificationsModel.bulkCreate(stu_loc_changed_notification,
                        { transaction: transactionInstance });
                };

                //send (socket io) notification details
                const stu_send_notification_data = {
                    student_first_name: student_first_name,
                    student_last_name: student_last_name,
                    dormitory_name: dormitory_name,
                    user_name: login_user.first_name + "" + login_user.last_name,
                    stu_current_loc_name: stu_current_loc_name,
                    created_date: DateTime.now().setZone(timezone),
                    school_code:login_user.school_code
                };
                //send notifications (socket io)

                socketIO.emit("new-notification", stu_send_notification_data);
                // socketIO.in(login_user.school_code).emit('new-notification', stu_send_notification_data);
            };
            res.json({
                status: 200,
                success: true,
                message: "Student Location changed successfully!"
            });
        });

    } catch (error) {
        console.log(error);
        return res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })
    };
};
module.exports.SignOutStudentReasonOrOncampus = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    let stu_reason_oncampus_details = req.body;
    const { stu_reason_oncampus_uuid, student_id } = stu_reason_oncampus_details;
    stu_reason_oncampus_details.updated_by = login_user.user_id;
    try {
        const BssStuReasonOncampusModel = await BssStuReasonOncampus(config_sequelize);
        const BssStuCurrrentLocationModel = await BssStuCurrrentLocation(config_sequelize);

        config_sequelize.transaction(async (transactionInstance) => {
            stu_reason_oncampus_details.sign_in_out_status = 2;
            stu_reason_oncampus_details.sign_out_date = DateTime.now()
            await BssStuReasonOncampusModel.update(stu_reason_oncampus_details, {
                where: { stu_reason_oncampus_uuid },
                transaction: transactionInstance
            });

            //Update or create the student current location
            await BssStuCurrrentLocationModel.upsert({
                student_id: student_id,
                reason_id: null,
                on_campus_location_id: null,
                current_present_status: true
            }, { transaction: transactionInstance });

            res.json({
                status: 200,
                success: true,
                message: "Student Location updated successfully!"
            })
        })
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

module.exports.SnapshotSignInOrSignOutStudents = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;
        const login_user = req.login_user;
        let {snapshotData:studentsDetails} = req.body;

        const BssStuReasonOncampusModel = await BssStuReasonOncampus(config_sequelize);
        const BssStuCurrrentLocationModel = await BssStuCurrrentLocation(config_sequelize);
        const BssUsersModel = await BssUsers(config_sequelize);
        const BssStuLocChangeNotificationsModel = await BssStuLocChangeNotifications(config_sequelize);
        const BssStudentsModel = await BssStudents(config_sequelize);

        let stuCurrentLocationArray = [];
        let stuReasonOnCampusArray = [];
        let stuIdArr = [];
        //parse data
        studentsDetails=JSON.parse(studentsDetails)

        config_sequelize.transaction(async (transaction) => {

            for (let studentDetail of studentsDetails) {


                stuIdArr = [...stuIdArr, studentDetail.student_id];
                //signout(present)
                if (studentDetail.sign_in_out_status === "2" || studentDetail.sign_in_out_status === 2) {

                    studentDetail.sign_out_date = DateTime.now();
                    stuCurrentLocationArray = [
                        ...stuCurrentLocationArray,
                        {
                            student_id: studentDetail.student_id,
                            reason_id: null,
                            on_campus_location_id: null,
                            current_present_status: true,
                            updated_by: login_user.user_id
                        }
                    ];
                    //update stuRessonOnCampus details
                    await BssStuReasonOncampusModel.update({
                        sign_in_out_status: 2,
                        sign_out_date: DateTime.now()
                    }, { where: { stu_reason_oncampus_uuid: studentDetail.stu_reason_oncampus_uuid, }, transaction });
                };
                //signIn(locations)
                if (studentDetail.sign_in_out_status === "1" || studentDetail.sign_in_out_status === 1) {
                    // notifications data
                    if (studentDetail.stu_current_loc_name.toLowerCase() === "mia") {
                        const userRes = await BssUsersModel.findAll({ where: { is_user_activate: true } });
                        let stu_loc_changed_notification = [];
                        if (userRes) {
                            userRes.forEach((userVal) => {
                                stu_loc_changed_notification.push({
                                    student_id: studentDetail.student_id,
                                    stu_current_loc_name: studentDetail.stu_current_loc_name,
                                    user_id: userVal.user_id,
                                    created_by: login_user.user_id,
                                });
                            });
                            //create notification
                            await BssStuLocChangeNotificationsModel.bulkCreate(stu_loc_changed_notification,
                                { transaction });
                        };
                        //send (socket io) notification details
                        const stu_send_notification_data = {
                            student_first_name: studentDetail.student_first_name,
                            student_last_name: studentDetail.student_last_name,
                            dormitory_name: studentDetail.dormitory_name,
                            user_name: login_user.first_name + "" + login_user.last_name,
                            stu_current_loc_name: studentDetail.stu_current_loc_name,
                            created_date: DateTime.now()
                        };
                        //send notifications (socket io)
                        socketIO.in(login_user.school_code).emit('new-notification', stu_send_notification_data);
                    };
                    stuCurrentLocationArray = [
                        ...stuCurrentLocationArray,
                        {
                            student_id: studentDetail?.student_id,
                            reason_id: studentDetail?.reason_id || null,
                            on_campus_location_id: studentDetail?.on_campus_location_id || null,
                            current_present_status: false,
                            updated_by: login_user.user_id
                        }
                    ];
                    stuReasonOnCampusArray = [
                        ...stuReasonOnCampusArray,
                        {
                            student_id: studentDetail?.student_id,
                            sign_in_out_status: 1,
                            reason_id: studentDetail?.reason_id || null,
                            on_campus_location_id: studentDetail?.on_campus_location_id || null,
                            sign_in_date: DateTime.now()
                        }
                    ];
                };
            };

            //(update)if student present then reason and oncampus id will be null
            if (stuCurrentLocationArray.length > 0) {
                await BssStuCurrrentLocationModel.bulkCreate(
                    stuCurrentLocationArray,
                    {
                        updateOnDuplicate: ["student_id", "reason_id", "on_campus_location_id",
                            "current_present_status", "updated_by"], transaction
                    },);
                await BssStuReasonOncampusModel.bulkCreate(stuReasonOnCampusArray, { transaction });
            };
            console.log(stuIdArr)
            if (stuIdArr) {
                await BssStudentsModel.update({ rollcall_compare_status: false, updated_by: login_user.user_id },
                    { where: { student_id: stuIdArr }, transaction });
            };
            res.json({
                status: 200,
                success: true,
                message: "Students Location updated successfully!"
            });
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
module.exports.ExportStudentLocationHistoryPdf = async (req, res) => {
    const login_user = req.login_user;
    const config_sequelize = req.config_sequelize;
    const { timezone, school_name, school_code } = login_user.user_school;
    const { student_uuid, dormitory_name, search_by_days } = req.query;

    let inner_where_data = {};

    if (search_by_days) {
        const fromDate = DateTime.now().setZone(timezone).minus({ day: search_by_days }).startOf('day').toISO();
        const toDate = DateTime.now().setZone(timezone).endOf('day').toISO();
        inner_where_data = {
            created_date: {
                [Sq.Op.and]: {
                    [Sq.Op.gte]: fromDate,
                    [Sq.Op.lte]: toDate
                }
            }
        }

    };

    const BssStudentsModel = await BssStudents(config_sequelize);
    const BssStuReasonOncampusModel = await BssStuReasonOncampus(config_sequelize);
    const BssStudentAttendanceModel = await BssStudentAttendance(config_sequelize);
    const BssOnCampusLocationsModel = await BssOnCampusLocations(config_sequelize);
    const BssReasonsModel = await BssReasons(config_sequelize);
    // const BssAdhocLeaveModel = await BssAdhocLeave(config_sequelize);
    //Relation
    // BssStudentsModel.hasMany(BssAdhocLeaveModel,
    //     { as: "stu_adhoc_data", foreignKey: "student_id", sourceKey: "student_id" });

    BssStudentsModel.findOne({
        where: { student_uuid },
        attributes: ["student_first_name", "student_last_name"],

        include: [{
            model: BssStudentAttendanceModel, as: "stu_atten_details",
            order: [['created_date', 'desc']],
            where: inner_where_data,
            // separate:true,
            attributes: ["atten_info", "is_attendance", "created_date", "reason_id",],
            required: false,
            include: [

                {
                    model: BssReasonsModel, as: "atten_reason_data",
                    attributes: ["reason_name"],
                    required: false,
                }
            ]
        },
        {
            model: BssStuReasonOncampusModel, as: "campus_or_reasons_data",
            attributes: ["stu_reason_oncampus_id", "sign_in_out_status", "sign_in_date", "sign_out_date", "created_date"],
            where: inner_where_data,
            required: false,
            include: [{
                model: BssReasonsModel, as: "reason_data",
                attributes: ["reason_name"],
                required: false,
            }, {
                model: BssOnCampusLocationsModel,
                attributes: ["on_campus_location_id", "location_name"],
                required: false,
            }]
        },
        // {
        //     model: BssAdhocLeaveModel,
        //     where: { check_in_out: { [Sq.Op.ne]: "pending" } },
        //     as: "stu_adhoc_data",
        //     separate: true,
        //     attributes: ["adhoc_leave_id", "departure_date", "arrival_date", "check_in_out"
        //     ],
        //     required: false,

        // }
        ],
        order: [[{ model: BssStudentAttendanceModel, as: 'stu_atten_details' }, 'created_date', 'ASC']],
        hooks: false
    },).then(async (response) => {

        let response_data = [...response.stu_atten_details, ...response.campus_or_reasons_data, 
        // ...response.stu_adhoc_data
        ];

        //Create the new array of object
        let response_location_array = [];
        console.log(response_data)
        response_data.forEach((res_value, res_ind) => {
            let dateFormated;
            if (res_value?.created_date) {
                dateFormated = DateTime.fromISO(res_value?.created_date.toISOString()).setZone(timezone).toFormat('dd/MM/yyyy h:mm a');
            }
            // res_value.atten_reason_data ? response_location_array.push({ timestamp: res_value.created_date, date: dateFormated, location: `${res_value.atten_info}(${res_value.atten_reason_data.reason_name})` }) : "";
            // res_value.is_attendance ? response_location_array.push({ timestamp: res_value.created_date, date: dateFormated, location: `${res_value.atten_info}` }) : "";
            res_value?.stu_reason_oncampus_id && res_value.reason_data?.reason_name ? response_location_array.push({ timestamp: res_value.created_date, date: dateFormated, location: res_value.reason_data.reason_name }) : "";
            res_value?.stu_reason_oncampus_id && res_value.bss_on_campus_location?.location_name ? response_location_array.push({ timestamp: res_value.created_date, date: dateFormated, location: res_value.bss_on_campus_location.location_name }) : "";
            res_value.sign_in_out_status == 2 ? response_location_array.push({ timestamp: res_value.created_date, date: dateFormated, location: "Present" }) : "";
            //Adhoc leave data
            // res_value?.check_in_out == "out" || res_value?.check_in_out == "in" ? response_location_array.push(
            //     { timestamp: res_value.departure_date, date: DateTime.fromISO(res_value?.departure_date.toISOString()).setZone(timezone).toFormat('dd/MM/yyyy h:mm a'), location: "Ad-hoc leave depart" },
            //     { timestamp: res_value.arrival_date, date: DateTime.fromISO(res_value?.arrival_date.toISOString()).setZone(timezone).toFormat('dd/MM/yyyy h:mm a'), location: "Ad-hoc leave arrival" }) : ""
        });

        //Sort the data (created_date)
        function sortFunction(a, b) {
            var dateA = new Date(a.timestamp).getTime();
            var dateB = new Date(b.timestamp).getTime();
            return dateA < dateB ? 1 : -1;
        };
        response_location_array.sort(sortFunction);

        let file_name = `Export-SnapshotHistoryPdf-${new Date().getTime()}.pdf`;
        let uploadFilePath = `uploads/${school_code}/${file_name}`;
        const createPdfFile = fs.createWriteStream(uploadFilePath);

        // init document
        let doc = new PDFDocument({ margin: 25, size: 'A4' });
        // save document

        doc.pipe(createPdfFile);
        const todayDate = DateTime.now().setZone(timezone).toFormat(('dd/MM/yyyy'))

        //////////////////////////Generate pdf start//////////////////////////
        //create table with first headers
        const firstHeader = {
            title: { label: "Location History", fontSize: 22, },
            subtitle: { label: `Generated by Boarding School Suit` },
            headers: [
                { label: `${school_name}`, width: 274, headerColor: "white", },
                { label: `Date:${todayDate} `, width: 274, align: "right", headerAlign: "right", headerColor: "white", },
                ,],
            // complex data 
            datas: [],
            rows: [],
        };
        await doc.table(firstHeader,
            { prepareHeader: () => doc.font("Helvetica-Bold").fontSize(13), });

        // create table with second headers
        const second_header = {
            headers: [
                { label: `Name:${response.student_first_name + " " + response.student_last_name}`, width: 274, headerColor: "white", },
                { label: `Dormitory ${dormitory_name}`, valign: "right", headerAlign: "right", align: "right", width: 274, headerColor: "white", },],
            // complex data
            datas: [],
            rows: [],
        };
        await doc.table(second_header,
            {
                prepareHeader: () => doc.font("Helvetica-Bold").fontSize(13),
            });

        //Create tabel data
        const table = {
            headers: [
                { label: `Date & Time`, property: 'date', width: 274, },
                { label: `Location`, property: 'location', valign: "left", headerAlign: "left", align: "left", width: 274, },],
            // complex data
            datas: [...response_location_array,],
        };
        await doc.table(table,
            {// padding: 3,
                prepareHeader: () => doc.font("Helvetica-Bold").fontSize(13),
                prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                    doc.font("Helvetica").fontSize(13);
                }
            });

        doc.end();
        //////////////////////////End create pdf //////////////////////////
        res.json({
            status: 200,
            success: true,
            message: "Student's Pdf Exported Successfully!",
            data: response,
            file: process.env.APP_URL + "/" + uploadFilePath
        });

        // Delete the file after 10 seconds
        setTimeout(async () => {
            let filePath = `${appRoot}/${uploadFilePath}`;
            await DeleteFile(filePath)
        }, "10000");

    }).catch((error) => {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."

        });
    })

};
module.exports.GetStudentAndOtherdetailsById = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const { student_id } = req.query;

    const BssStudentsModel = await BssStudents(config_sequelize);
    const BssDormitoriesModel = await BssDormitories(config_sequelize);
    const BssParentsModel = await BssParents(config_sequelize);
    const BssStudentAllergyModel = await BssStudentAllergy(config_sequelize);

    BssStudentsModel.findOne({
        where: { student_id },
        attributes: ["student_uuid", "student_id", "student_first_name", "student_last_name", "student_avatar",
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('date_of_birth'), PG_ENCRYPT_KEY), "date_of_birth"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('sporting_house'), PG_ENCRYPT_KEY), "sporting_house"],
        ],
        include: [{
            model: BssDormitoriesModel, as: "dormitory_data", attributes:
                [[Sq.fn('PGP_SYM_DECRYPT', Sq.col('dormitory_name'), PG_ENCRYPT_KEY), "dormitory_name"]]
        },
        {
            model: BssParentsModel, as: "parent_data", attributes:
                ["mother_name", "father_name",
                    [Sq.fn('PGP_SYM_DECRYPT', Sq.col('mother_email'), PG_ENCRYPT_KEY), "mother_email"],
                    [Sq.fn('PGP_SYM_DECRYPT', Sq.col('mother_phone'), PG_ENCRYPT_KEY), "mother_phone"],
                    [Sq.fn('PGP_SYM_DECRYPT', Sq.col('father_email'), PG_ENCRYPT_KEY), "father_email"],
                    [Sq.fn('PGP_SYM_DECRYPT', Sq.col('father_phone'), PG_ENCRYPT_KEY), "father_phone"]
                ]
        }, {
            model: BssStudentAllergyModel, as: "allergy_details", attributes:
                [[Sq.fn('PGP_SYM_DECRYPT', Sq.col('allergy_name'), PG_ENCRYPT_KEY), "allergy_name"]]
        },
        ],
        hooks: false
    }).then((reponse) => {
        res.json({
            status: 200,
            success: true,
            data: reponse,
            message: "Get Student details successfully!"
        });

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

module.exports.GetStudentDiaryCommentsById = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const { student_id, diary_comment_type } = req.query;
    const { timezone } = login_user.user_school;

    console.log(timezone)
    const BssUsersModel = await BssUsers(config_sequelize);
    const BssDiaryCommentsModel = await BssDiaryComments(config_sequelize);

    BssDiaryCommentsModel.findAll({
        where: { student_id, diary_comment_type },
        attributes: ["diary_comment_id", "student_id", "diary_comment_desc", "diary_comment_type", "created_date",
            [Sq.literal(`"bss_diary_comments"."created_date"::timestamptz AT TIME ZONE '${timezone}'`), 'created_date']
        ],
        include: {
            model: BssUsersModel, as: "comment_by_user",
            attributes: ["first_name", "last_name"]
        }, order: [["diary_comment_id", "desc"]]
    }).then((response) => {

        res.json({
            status: 200,
            success: true,
            data: response,
            message: `Get All Student ${diary_comment_type} comment successfully!`
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
module.exports.UpdateSnapshotRollCallCompareStatus = async (req, res,) => {
    try {
        const login_user = req.login_user;
        const config_sequelize = req.config_sequelize;
        const { student_id } = req.body;

        const BssStudentsModel = await BssStudents(config_sequelize);
        await BssStudentsModel.update({ rollcall_compare_status: false, updated_by: login_user.user_id },
            { where: { student_id } });
        res.json({
            status: 200,
            success: true,
            message: "Snapshot Rollcall compare status updated successfully!"
        });

    } catch (error) {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });

    };
};

