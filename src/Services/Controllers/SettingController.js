const Sq = require("sequelize");
const { DateTime, } = require("luxon");
const { BssUserMessages, BssCustomLinks, BssOnCampusLocations, BssEventCalendar, BssMasterSettings, BssReasons, BssStudentAttendance,
BssRole, BssRolePermissions, BssRolePermClassDorm,BssClasses, BssDormitories } = require("../Models/common");
const {SystemLogsFun} = require("../../libs/Helper");


module.exports.GetMonthlyAbsentReasonForChart = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const timezone = login_user.user_school.timezone;

    const lastMonthStart = DateTime.now().setZone(timezone).minus({ month: 1 }).startOf('month').toString();
    const lastMonthEnd = DateTime.now().setZone(timezone).minus({ month: 1 }).endOf('month').toString();
    console.log(lastMonthStart, lastMonthEnd)

    const BssStudentAttendanceModel = await BssStudentAttendance(config_sequelize);
    const BssReasonsModel = await BssReasons(config_sequelize);
    BssStudentAttendanceModel.findAll({
        where: {
            created_date: {
                [Sq.Op.and]: {
                    [Sq.Op.gte]: lastMonthStart,
                    [Sq.Op.lte]: lastMonthEnd
                }
            },
            is_attendance: false,
        },
        attributes: [
            [Sq.fn('COUNT', Sq.col('bss_student_attendance.reason_id'),), 'reason_count',]],
        include: [{
            model: BssReasonsModel, as: "atten_reason_data",
            attributes: ["reason_name"]
        },],
        group: ["bss_student_attendance.reason_id",
            "atten_reason_data.reason_uuid",
            "atten_reason_data.reason_id"]
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Monthly Absent reasons for Chart successfully!"
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

module.exports.GetYearlyAbsentReasonForChart = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const timezone = login_user.user_school.timezone;

    const lastYearStart = DateTime.now().setZone(timezone).minus({ year: 1 }).startOf('year').toString();
    const lastYearEnd = DateTime.now().setZone(timezone).minus({ year: 1 }).endOf('year').toString();
    console.log(lastYearStart, lastYearEnd)

    const BssStudentAttendanceModel = await BssStudentAttendance(config_sequelize);
    const BssReasonsModel = await BssReasons(config_sequelize);
    BssStudentAttendanceModel.findAll({
        where: {
            created_date: {
                [Sq.Op.and]: {
                    [Sq.Op.gte]: lastYearStart,
                    [Sq.Op.lte]: lastYearEnd
                }
            },
            is_attendance: false,
        },
        attributes: [
            [Sq.fn('COUNT', Sq.col('bss_student_attendance.reason_id'),), 'reason_count',]],
        include: [{
            model: BssReasonsModel, as: "atten_reason_data",
            attributes: ["reason_name"]
        },],
        group: ["bss_student_attendance.reason_id",
            "atten_reason_data.reason_uuid",
            "atten_reason_data.reason_id"]
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Monthly Absent reasons for Chart successfully!"
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
module.exports.GetMonthlyAttendanceCountForChart = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user
    const timezone = login_user.user_school.timezone;

    const lastMonthStart = DateTime.now().setZone(timezone).minus({ month: 1 }).startOf('month').toString();
    const lastMonthEnd = DateTime.now().setZone(timezone).minus({ month: 1 }).endOf('month').toString()
    const BssStudentAttendanceModel = await BssStudentAttendance(config_sequelize);

    BssStudentAttendanceModel.findAll({
        where: {
            created_date: {
                [Sq.Op.and]: {
                    [Sq.Op.gte]: lastMonthStart,
                    [Sq.Op.lte]: lastMonthEnd
                }
            }
        },

        attributes: ["is_attendance", [Sq.fn('COUNT', Sq.col('is_attendance'),), 'atten_count',]],
        group: ["bss_student_attendance.is_attendance"]

    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Monthly Attedance for Chart successfully!"
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
module.exports.GetYearlyAttendanceCountForChart = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user
    const timezone = login_user.user_school.timezone;

    const lastYearStart = DateTime.now().setZone(timezone).minus({ year: 1 }).startOf('year').toString();
    const lastYearEnd = DateTime.now().setZone(timezone).minus({ year: 1 }).endOf('year').toString();

    const BssStudentAttendanceModel = await BssStudentAttendance(config_sequelize);

    BssStudentAttendanceModel.findAll({
        where: {
            created_date: {
                [Sq.Op.and]: {
                    [Sq.Op.gte]: lastYearStart,
                    [Sq.Op.lte]: lastYearEnd
                }
            }
        },
        attributes: ["is_attendance", [Sq.fn('COUNT', Sq.col('is_attendance'),), 'atten_count',]],
        group: ["bss_student_attendance.is_attendance"]

    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Yearly Attedance for Chart successfully!"
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



module.exports.CreateUserMessage = async (req, res) => {
    const user_message_details = req.body;
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    user_message_details.created_by = login_user.user_id;

    const BssUserMessagesModel = await BssUserMessages(config_sequelize);
    BssUserMessagesModel.create(user_message_details).then((response) => {
        let sys_obj ={
            user_id:login_user.user_id,
            action:"created",
            html_info:`A new message for staff is added by <strong> ${login_user.first_name} ${login_user.last_name} </strong> !`
        }
         
        SystemLogsFun(sys_obj,config_sequelize)
        res.json({
            status: 200,
            success: true,
            message: "Message created successfully!"
        })
    }).catch((error) => {
        res.json({
            status: 400,
            error:error.message,
            success: false,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."

        })
    })
}

module.exports.GetAllUserMessages = async (req, res) => {
    const { page, limit, sort, order, search } = req.query;
    const config_sequelize = req.config_sequelize;
    const BssUserMessagesModel = await BssUserMessages(config_sequelize);

    let where_object = {};
    let query_object = {};

    if (search) {
        where_object = {
            ...where_object,
            user_message_title: Sq.where(Sq.fn("LOWER", Sq.col("user_message_title"),), "LIKE", "%" + search.toLowerCase() + "%")
            // Sq.where(Sq.fn('LOWER', Sq.col('user_message_title')), { [Sq.Op.iLike]: `%${search.toLowerCase()}%` })
        }
    }
    if (page && limit) {
        query_object = {
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

    BssUserMessagesModel.findAndCountAll({
        where: where_object,
        attributes: ["user_message_uuid", "user_message_id", "user_message_title",
            "user_message_desc", "is_user_message_active"], ...query_object
    }).then((response) => {

        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get All Messages successfully!"

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

module.exports.GetUserMessageById = async (req, res) => {
    const { user_message_uuid } = req.query;
    const config_sequelize = req.config_sequelize;
    const BssUserMessagesModel = await BssUserMessages(config_sequelize);

    BssUserMessagesModel.findOne({
        where: { user_message_uuid },
        attributes: ["user_message_uuid", "user_message_id", "user_message_title",
            "user_message_desc", "is_user_message_active"]
    }).then((response) => {

        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Message successfully!"

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
module.exports.UpdateUserMessageStatus = async (req, res) => {
    const { user_message_uuid, is_user_message_active } = req.body;
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;

    const BssUserMessagesModel = await BssUserMessages(config_sequelize);

    BssUserMessagesModel.update({ is_user_message_active, updated_by: login_user.user_id },
        { where: { user_message_uuid }, returning:true , plain:true }).then((response) => {
    
            let sys_obj ={
                user_id:login_user.user_id,
                action:"updated",
                html_info:`Message [${response[1].user_message_title}]  status updated by <strong> ${login_user.first_name} ${login_user.last_name} </strong> ${is_user_message_active === true || is_user_message_active === "true" ? "Actived" : "Deactivated"} !`
    
            }
            SystemLogsFun(sys_obj,config_sequelize)
            res.json({
                status: 200,
                success: true,
                message: `Message ${is_user_message_active === true || is_user_message_active === "true" ? "Actived" : "Deactivated"} successfully!`
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
module.exports.UpdateUserMessage = async (req, res) => {
    const login_user = req.login_user;
    const config_sequelize = req.config_sequelize;
    const user_message_details = req.body;
    const { user_message_uuid } = user_message_details;
    delete user_message_details.user_message_uuid;
    user_message_details.updated_by = login_user.user_id;

    const BssUserMessagesModel = await BssUserMessages(config_sequelize);

    BssUserMessagesModel.update(user_message_details, { where: { user_message_uuid } }).then((response) => {
        let sys_obj ={
            user_id:login_user.user_id,
            action:"updated",
            html_info:`Message information is updated by <strong> ${login_user.first_name} ${login_user.last_name} </strong> ! `

        }
        SystemLogsFun(sys_obj,config_sequelize)
        res.json({
            status: 200,
            success: true,
            message: "Message Updated successfully!"
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

module.exports.DeleteUserMessage = async (req, res) => {
    const login_user =req.login_user

    const config_sequelize = req.config_sequelize;
    const { user_message_uuid } = req.body;

    const BssUserMessagesModel = await BssUserMessages(config_sequelize);

    BssUserMessagesModel.destroy({ where: { user_message_uuid } }).then((response) => {
        let sys_obj ={
            user_id:login_user.user_id,
            action:"deleted",
            html_info:` A message was deleted by <strong> ${login_user.first_name} ${login_user.last_name} </strong>`
        }
        SystemLogsFun(sys_obj,config_sequelize)


        res.json({
            status: 200,
            success: true,
            message: "Message Deleted successfully!"
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
//Custom link api's
module.exports.CreateCustomLink = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const custom_link_details = req.body;
    custom_link_details.created_by = login_user.user_id;

    const BssCustomLinksModel = await BssCustomLinks(config_sequelize);
    BssCustomLinksModel.create(custom_link_details).then((response) => {
        let sys_obj ={
            user_id:login_user.user_id,
            action:"created",
            html_info:`A new Custom link was created by <strong>${login_user.first_name} ${login_user.last_name} </strong> !`
        }
        SystemLogsFun(sys_obj,config_sequelize)

        res.json({
            status: 200,
            success: true,
            message: "Custom Link created successfully!"
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

module.exports.GetAllCustomLinks = async (req, res) => {
    const { page, limit, search } = req.query;
    const config_sequelize = req.config_sequelize;
    const BssCustomLinksModel = await BssCustomLinks(config_sequelize);

    let where_object = {};
    let query_object = {};

    if (search) {
        where_object = {
            custom_link_title: Sq.where(Sq.fn("LOWER", Sq.col("custom_link_title"),), "LIKE", "%" + search.toLowerCase() + "%")
        }

    }
    if (page && limit) {
        query_object.offset = 0 + (page - 1) * limit;
        query_object.limit = limit;
    }
    BssCustomLinksModel.findAndCountAll({
        where: where_object,
        attributes: ["custom_link_uuid", "custom_link_title", "custom_link_url"],
        ...query_object
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get all Custom Links successfully!"
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

module.exports.GetCustomLinkById = async (req, res) => {
    const { custom_link_uuid } = req.query;
    const config_sequelize = req.config_sequelize;
    const BssCustomLinksModel = await BssCustomLinks(config_sequelize);

    BssCustomLinksModel.findOne({
        where: { custom_link_uuid: custom_link_uuid },
        attributes: ["custom_link_uuid", "custom_link_title", "custom_link_url"],

    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Custom Link by Id successfully!"
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
module.exports.UpdateCustomLink = async (req, res) => {
    const login_user = req.login_user;
    const config_sequelize = req.config_sequelize;
    const custom_link_details = req.body;
    const { custom_link_uuid } = custom_link_details;
    delete custom_link_details.custom_link_uuid;
    custom_link_details.updated_by = login_user.user_id;

    const BssCustomLinksModel = await BssCustomLinks(config_sequelize);

    BssCustomLinksModel.update(custom_link_details, { where: { custom_link_uuid } }).then((response) => {

        let sys_obj ={
            user_id:login_user.user_id,
            action:"updated",
            html_info:`Custom link information is updated by <strong>${login_user.first_name} ${login_user.last_name} </strong> !`
        }
        SystemLogsFun(sys_obj,config_sequelize)

        
        res.json({
            status: 200,
            success: true,
            message: "Update Custome Link successfully!"
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

    module.exports.DeleteCustomLink = async (req, res) => {
    const login_user = req.login_user;
    const config_sequelize = req.config_sequelize;
    const { custom_link_uuid } = req.body;

    const BssCustomLinksModel = await BssCustomLinks(config_sequelize);
    BssCustomLinksModel.destroy({ where: { custom_link_uuid } }).then((response) => {

        let sys_obj ={
            user_id:login_user.user_id,
            action:"deleted",
            html_info:`Custom link information was deleted by <strong>${login_user.first_name} ${login_user.last_name} </strong> !`
        }
        SystemLogsFun(sys_obj,config_sequelize)

        
        
        res.json({
            status: 200,
            success: true,
            message: "Delete Custome Link successfully!"
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

module.exports.CreateOnCampusLocation = async (req, res) => {
    const login_user = req.login_user;
    const config_sequelize = req.config_sequelize;
    const on_campus_location_details = req.body;
    on_campus_location_details.created_by = login_user.user_id;

    const BssOnCampusLocationsModel = await BssOnCampusLocations(config_sequelize);
    BssOnCampusLocationsModel.create(on_campus_location_details).then((response) => {
        res.json({
            status: 200,
            success: true,
            message: "Campus Location created successfully!"

        })
    }).catch((error) => {
        console.log(error);
        res.json({
            status: 400,
            error: error,
            success: false,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."

        })
    })

}

module.exports.GetAllOnCampusLocation = async (req, res) => {

    const config_sequelize = req.config_sequelize;
    const { page, limit, sort, order } = req.query;

    let query_object = {};

    if (page && limit) {
        query_object = {
            ...query_object,
            offset: 0 + (page - 1) * limit,
            limit: limit
        }

    }
    if (sort && order) {
        query_object.order = [[sort, order]]

    }

    const BssOnCampusLocationsModel = await BssOnCampusLocations(config_sequelize);
    BssOnCampusLocationsModel.findAndCountAll({
        attributes:
            ["on_campus_location_id", "on_campus_location_uuid",
                "location_name", "is_on_campus_activate"], ...query_object
    })
        .then((response) => {
            res.json({
                status: 200,
                success: true,
                data: response,
                message: "Get All Campus Location  successfully!"

            })
        }).catch((error) => {
            res.json({
                status: 400,
                success: false,
                message: "Something went wrong. Please try again or reach out to support if the issue persists."


            })
        })

}

module.exports.GetOnCampusLocationById = async (req, res) => {

    const config_sequelize = req.config_sequelize;
    const { on_campus_location_uuid } = req.query;

    const BssOnCampusLocationsModel = await BssOnCampusLocations(config_sequelize);
    BssOnCampusLocationsModel.findOne({
        where: { on_campus_location_uuid },
        attributes:
            ["on_campus_location_id", "on_campus_location_uuid",
                "location_name", "is_on_campus_activate"],
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Campus Location by Id successfully!"

        })
    }).catch((error) => {
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."


        })
    })

}
module.exports.UpdateOnCampusLocationDetails = async (req, res) => {

    const login_user = req.login_user;
    const config_sequelize = req.config_sequelize;
    const on_campus_location_details = req.body;
    const { on_campus_location_uuid } = on_campus_location_details
    delete on_campus_location_details.on_campus_location_uuid;

    const BssOnCampusLocationsModel = await BssOnCampusLocations(config_sequelize);

    BssOnCampusLocationsModel.update(on_campus_location_details,
        { where: { on_campus_location_uuid } }).then((response) => {
            res.json({
                status: 200,
                success: true,
                message: "Update Campus Location details successfully!"

            })
        }).catch((error) => {
            console.log(error);
            res.json({
                status: 400,
                success: false,
                message: "Something went wrong. Please try again or reach out to support if the issue persists."


            })
        })

}

module.exports.UpdateOnCampusLocationStatus = async (req, res) => {

    const login_user = req.login_user;
    const config_sequelize = req.config_sequelize;
    const { on_campus_location_uuid, is_on_campus_activate } = req.body;

    const BssOnCampusLocationsModel = await BssOnCampusLocations(config_sequelize);
    BssOnCampusLocationsModel.update({ is_on_campus_activate },
        { where: { on_campus_location_uuid } }).then((response) => {
            res.json({
                status: 200,
                success: true,
                message: `Campus Location ${is_on_campus_activate === true || is_on_campus_activate === "true" ? "Activate" : "Deactivate"} successfully!`

            })
        }).catch((error) => {
            console.log(error);
            res.json({
                status: 400,
                error: error,
                success: false,
                message: "Something went wrong. Please try again or reach out to support if the issue persists."
            })
        })

}

module.exports.DeleteOnCampusLocation = async (req, res) => {

    const login_user = req.login_user;
    const config_sequelize = req.config_sequelize;
    const { on_campus_location_uuid } = req.body;

    const BssOnCampusLocationsModel = await BssOnCampusLocations(config_sequelize);
    BssOnCampusLocationsModel.destroy(
        { where: { on_campus_location_uuid } }).then((response) => {
            res.json({
                status: 200,
                success: true,
                message: "Campus Location Deleted successfully!"

            })
        }).catch((error) => {
            console.log(error);
            res.json({
                status: 400,
                success: false,
                message: "Something went wrong. Please try again or reach out to support if the issue persists."


            })
        })

}

module.exports.GetOnCampusLocationsList = async (req, res) => {
    const config_sequelize = req.config_sequelize;

    const BssOnCampusLocationsModel = await BssOnCampusLocations(config_sequelize);
    BssOnCampusLocationsModel.findAll({
        where: { is_on_campus_activate: true }, order: [["location_name", "asc"]]
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get All Campus Location List successfully!"

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
//Event Calendar api's
module.exports.CreateEventCalendar = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const {timezone} =login_user.user_school
    const event_calendar_details = req.body;
    event_calendar_details.created_by = login_user.user_id;
    console.log(req.body)

    const BssEventCalendarModel = await BssEventCalendar(config_sequelize);
    BssEventCalendarModel.create(event_calendar_details).then((response) => {

        let eventStart = DateTime.now(event_calendar_details.event_start).setZone(timezone).toLocaleString(DateTime.DATE_MED)
        let sys_obj ={
            user_id:login_user.user_id,
            action:"created",
            html_info:`A new event has been added by ${login_user.first_name} ${login_user.last_name} on ${eventStart}!`
        }
        SystemLogsFun(sys_obj,config_sequelize)
        res.json({
            status: 200,
            success: true,
            message: "Calendar Event created successfully!"
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

module.exports.GetEventCalendarDetailsById = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const { event_calendar_uuid } = req.query;

    const BssEventCalendarModel = await BssEventCalendar(config_sequelize);
    BssEventCalendarModel.findOne({
        where: { event_calendar_uuid },
        attributes: ["event_calendar_id", "event_calendar_uuid",
            "event_calendar_info", "event_start", "event_end"]
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Calendar Event successfully!"

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
module.exports.GetAllEventCalendarDetails = async (req, res) => {
    const config_sequelize = req.config_sequelize;

    const BssEventCalendarModel = await BssEventCalendar(config_sequelize);
    BssEventCalendarModel.findAll({
        attributes: ["event_calendar_id", "event_calendar_uuid",
            "event_calendar_info", "event_start", "event_end"]
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get All Calendar Events successfully!"

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
module.exports.UpdateEventCalendarDetails = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const event_calendar_details = req.body;
    const { event_calendar_uuid } = event_calendar_details;
    delete event_calendar_details.event_calendar_uuid;
    event_calendar_details.updated_by = login_user.user_id;

    const BssEventCalendarModel = await BssEventCalendar(config_sequelize);
    BssEventCalendarModel.update(event_calendar_details, { where: { event_calendar_uuid } })
        .then((response) => {
            res.json({
                status: 200,
                success: true,
                message: "Update Calendar Events Details successfully!"
                
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
module.exports.DeleteEventCalendarDetails = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const { event_calendar_uuid } = req.body;


    const BssEventCalendarModel = await BssEventCalendar(config_sequelize);
    BssEventCalendarModel.destroy({ where: { event_calendar_uuid } })
        .then((response) => {
            res.json({
                status: 200,
                success: true,
                message: "Calendar Event Deleted successfully!"

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

module.exports.CreateOrUpdateRollCall = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const roll_call_details = req.body;

    const BssMasterSettingsModel = await BssMasterSettings(config_sequelize);

    if (roll_call_details?.master_setting_uuid) {
        roll_call_details.updated_by = login_user.user_id;
        let master_setting_uuid = roll_call_details.master_setting_uuid;
        delete roll_call_details.master_setting_uuid;

        await BssMasterSettingsModel.update(roll_call_details, {
            raw: true,
            returning: true,
            where: { master_setting_uuid },
        })
            .then((response) => {
                return res.json({
                    status: 200,
                    success: true,
                    data: response[1][0],
                    message: "Roll Call Details updated  successfully!",
                });
            })
            .catch((error) => {
                console.log(error);
                res.json({
                    error: error,
                    status: 400,
                    success: false,
                    message: "Something went wrong. Please try again or reach out to support if the issue persists."
                });
            });
    } else if (!roll_call_details?.master_setting_uuid) {

        delete roll_call_details.master_setting_uuid;
        roll_call_details.created_by = login_user.user_id;
        roll_call_details.meta_key = "roll_call_schedule";

        await BssMasterSettingsModel.create(roll_call_details)
            .then((response) => {
                res.json({
                    status: 200,
                    success: true,
                    data: response,
                    message: "Roll Call Details created successfully!",
                });
            })
            .catch((error) => {
                console.log(error);
                res.json({
                    error: error,
                    status: 400,
                    success: false,
                    message: "Something went wrong. Please try again or reach out to support if the issue persists."
                });
            });
    }

}
module.exports.GetRollCallDetails = async (req, res) => {
    const config_sequelize = req.config_sequelize;

    const BssMasterSettingsModel = await BssMasterSettings(config_sequelize);

    BssMasterSettingsModel.findAll({ where: { meta_key: "roll_call_schedule" } }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get ROll Call details successfully!"

        })
    }).catch((error) => {
        console.log(error);
        res.json({
            error: error,
            status: 400,
            success: false,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });

    })

};

//role api's
module.exports.CreateRole = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;
        const login_user = req.login_user;
        const roleDetails = req.body;
        roleDetails.created_by = login_user.user_id;

        const BssRoleModel = await BssRole(config_sequelize);
        await BssRoleModel.create(roleDetails);

        res.json({
            status: 200,
            success: true,
            message: "Get role created successfully!"

        })
    } catch (error) {
        console.log(error);
        res.json({
            error: error,
            status: 400,
            success: false,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });


    };
};

module.exports.GetAllRoleList = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;

        const BssRoleModel = await BssRole(config_sequelize);
        const roleRes = await BssRoleModel.findAll({ attributes: ["role_uuid", "role_id", "role_name"] });

        res.json({
            status: 200,
            success: true,
            data: roleRes,
            message: "Get all role list successfully!"

        });
    } catch (error) {
        console.log(error);
        res.json({
            error: error,
            status: 400,
            success: false,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });

    };
};
module.exports.GetRoleById = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;
        const { role_uuid } = req.query;

        const BssRoleModel = await BssRole(config_sequelize);
        const roleRes = await BssRoleModel.findOne({
            where: { role_uuid },
            attributes: ["role_uuid", "role_id", "role_name","is_role_activate"]
        });

        res.json({
            status: 200,
            success: true,
            data: roleRes,
            message: "Get all role list successfully!"

        });
    } catch (error) {
        console.log(error);
        res.json({
            error: error,
            status: 400,
            success: false,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });

    };
};
module.exports.UpdateRole = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;
        const login_user = req.login_user;
        const roleDetails = req.body;
        const { role_uuid } = roleDetails;
        delete roleDetails.role_id;
        roleDetails.updated_by = login_user.updated_by;

        const BssRoleModel = await BssRole(config_sequelize);
        BssRoleModel.update(roleDetails, { where: { role_uuid } });

        res.json({
            status: 200,
            success: true,
            message: "Role updated successfully!"

        });
    } catch (error) {
        console.log(error);
        res.json({
            error: error,
            status: 400,
            success: false,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });
    };
};

module.exports.GetAllRoleDetails = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;
        const { page, limit, sort, order, } = req.query;
        let query_object = {};

        if (sort && order) {
            query_object.order = [[sort, order]];

        };
        if (page && limit) {
            query_object = {
                ...query_object,
                offset: 0 + (page - 1) * limit,
                limit: limit
            };

        };

        const BssRoleModel = await BssRole(config_sequelize);
        const roleRes = await BssRoleModel.findAndCountAll({
            attributes: ["role_uuid", "role_id", "role_name","is_role_activate"],
            ...query_object
        });

        res.json({
            status: 200,
            success: true,
            data: roleRes,
            message: "Get all role list successfully!"

        });
    } catch (error) {
        console.log(error);
        res.json({
            error: error,
            status: 400,
            success: false,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });

    };
};
//role permission api's
module.exports.CreateOrUpdateRolePermissions = async (req, res) => {
    try {
        const login_user = req.login_user;
        const config_sequelize = req.config_sequelize;
        const rolePermisssionDetails = req.body;
        let { role_permission_id, role_id, dorm_data, class_data } = rolePermisssionDetails;
        delete rolePermisssionDetails.role_permission_id;

        const BssRolePermissionModel = await BssRolePermissions(config_sequelize);
        const BssRolePermClassDormModel = await BssRolePermClassDorm(config_sequelize);
        console.log(rolePermisssionDetails)
        config_sequelize.transaction(async (transaction) => {

            if (!role_permission_id || role_permission_id == "") {
                rolePermisssionDetails.created_by = login_user.user_id;
                const rolePermissionRes = await BssRolePermissionModel.create(rolePermisssionDetails, { transaction });

                if (dorm_data.length > 0) {

                    let dormitory_array = [];
                    //find or create dormitory data
                    dorm_data.forEach((dorm_value) => {

                        dormitory_array.push({
                            role_id,
                            dormitory_id: dorm_value.dormitory_id, role_permission_id: rolePermissionRes.role_permission_id
                        });
                    });
                    await BssRolePermClassDormModel.bulkCreate(dormitory_array, { transaction });
                };
                //create class data
                if (class_data.length > 0) {

                    let class_array = [];

                    //create class data
                    class_data.forEach((class_value) => {
                        class_array.push({
                            role_id, class_id: class_value.class_id,
                            role_permission_id: rolePermissionRes.role_permission_id,
                        });
                    });
                    await BssRolePermClassDormModel.bulkCreate(class_array, { transaction });
                };
            };
            //if role permissin id exists
            if (role_permission_id) {

                rolePermisssionDetails.updated_by = login_user.user_id;
                await BssRolePermissionModel.update(rolePermisssionDetails,
                    { where: { role_permission_id }, transaction });

                //create dormitory data
                if (dorm_data.length > 0) {

                    let dormitory_ids = [];
                    //find or create dormitory data
                    dorm_data.forEach(async (dorm_value) => {

                        await BssRolePermClassDormModel.findOrCreate({
                            where: { role_id, dormitory_id: dorm_value.dormitory_id, role_permission_id },
                            defaults: {
                                role_id, dormitory_id: dorm_value.dormitory_id, role_permission_id
                            },
                        });
                        dormitory_ids.push(dorm_value.dormitory_id);
                    });

                    //delete existing class id data
                    await BssRolePermClassDormModel.destroy({
                        where:
                            { dormitory_id: { [Sq.Op.notIn]: dormitory_ids }, role_id, role_permission_id }, transaction
                    });
                } else {
                    await BssRolePermClassDormModel.destroy({
                        where:
                            { role_id, class_id: null }, transaction
                    });
                }
                //create class data
                if (class_data.length > 0) {

                    let class_ids = [];
                    //find or create class data
                    class_data.forEach(async (class_value) => {

                        await BssRolePermClassDormModel.findOrCreate({
                            where: { role_id, class_id: class_value.class_id, role_permission_id },
                            defaults: {
                                role_id, class_id: class_value.class_id, role_permission_id, role_permission_id
                            },
                        });
                        class_ids.push(class_value.class_id)
                    });

                    //delete existing class id data
                    await BssRolePermClassDormModel.destroy({
                        where:
                            { class_id: { [Sq.Op.notIn]: class_ids }, role_id }, transaction
                    });
                } else {
                    await BssRolePermClassDormModel.destroy({
                        where:
                            { role_id, dormitory_id: null }, transaction
                    });
                }

            };
            res.json({
                status: 200,
                success: true,
                message: `Permissions of specific role ${role_permission_id ? "Updated" : "Created"} successfully!`

            });
        });

    } catch (error) {
        console.log(error);
        res.json({
            error: error,
            status: 400,
            success: false,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });

    };

};
module.exports.GetPermissionsByRoleId = async (req, res,) => {
    try {
        const config_sequelize = req.config_sequelize;
        const { role_uuid } = req.query;

        const BssRoleModel = await BssRole(config_sequelize);
        const BssRolePermissionsModel = await BssRolePermissions(config_sequelize);
        const BssRolePermClassDormModel = await BssRolePermClassDorm(config_sequelize);
        const BssClassesModel = await BssClasses(config_sequelize);
        const BssDormitoriesModel = await BssDormitories(config_sequelize);
  
        const roleRes = await BssRoleModel.findOne({
            attributes: ["role_uuid", "role_id", "role_name"],
            where: { role_uuid },
            include: [{
                model: BssRolePermissionsModel, as: "roll_perm", required: true,
                include: {
                    //class or dormitory permissions data
                    model: BssRolePermClassDormModel,
                    attributes: ["role_perm_class_dorm_id"],
                    separate:true,
                    include: [
                        { model: BssClassesModel, as: "roll_perm_class", attributes: ["class_id", "class_name"] },
                        {
                            model: BssDormitoriesModel, as: "roll_perm_dorm",
                            attributes: ["dormitory_id","dormitory_type",
                                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('dormitory_name'), PG_ENCRYPT_KEY), "dormitory_name"],]
                        }
                    ]
                }
            }]
        });

        return res.json({
            status: 200,
            success: true,
            data: roleRes,
            message: "Get role and permission by id successfully!"

        });
    } catch (error) {
        console.log(error)
        res.json({
            error: error,
            status: 400,
            success: false,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });

    };
};

  module.exports.UpdateRoleStatus = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;
        const login_user = req.login_user;
        const role_details = req.body;
        const { role_uuid, is_role_activate } = role_details;
        delete role_details.role_uuid;
        role_details.updated_by = login_user.user_id;

        const BssRoleModel = await BssRole(config_sequelize);
        await BssRoleModel.update(role_details, { where: { role_uuid } })
        res.json({
            status: 200,
            success: true,
            message: `Role ${is_role_activate === "true" || is_role_activate === true ? "Activated" : "Deactivated"} successfully!`
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

module.exports.createDargId =async(req,res)=>{
    const config_sequelize =req.config_sequelize
    const login_user =req.login_user
    const roledetails =req.body
    const BssRoleModel = await BssRole(config_sequelize)

    BssRoleModel.update(roledetails).then((response)=>{
        res.json({
            success:true,
            message:"Bss Drag id updated successfully"
        })
    }).catch((error)=>{
        res.json({
            success:false,
            message:"something went wrong Please try again"
        })
    })
}