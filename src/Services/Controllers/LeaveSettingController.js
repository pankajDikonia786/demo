const Sq = require("sequelize");
const { BssActivity, BssTravelMode, BssLeaveRejectReasons,BssStudentHost, BssStudents, BssHost} = require("../Models/common");

//Activity Api's
module.exports.CreateActivity = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const activity_details = req.body;

    let changes = "sdfsdgdfhj" 

    activity_details.created_by = login_user.user_id;

    const BssActivityModel = await BssActivity(config_sequelize);
    BssActivityModel.create(activity_details).then((response) => {
        res.json({
            status: 200,
            success: true,
            message: "Activity Created successfully!"
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
module.exports.GetAllActivity = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const { page, limit, sort, order, search } = req.query;

    let query_data = {};
    let where_data = {};
    if (search) {
        where_data = {
            ...where_data,
            activity_name: { [Sq.Op.iLike]: "%" + search + "%" }
        }

    }

    if (page && limit) {
        query_data.offset = 0 + (page - 1) * limit;
        query_data.limit = limit

    }
    if (sort && order) {
        query_data.order = [[sort, order]]

    }

    const BssActivityModel = await BssActivity(config_sequelize);
    BssActivityModel.findAndCountAll({
        where: where_data, ...query_data
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get All Activity successfully!"
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
module.exports.GetActivityById = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const { activity_uuid } = req.query;

    const BssActivityModel = await BssActivity(config_sequelize);
    BssActivityModel.findOne({ where: { activity_uuid } }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Activity By Id successfully!"
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
module.exports.UpdateActivity = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const activity_details = req.body;
    const { activity_uuid } = activity_details;
    delete activity_details.activity_uuid;
    activity_details.updated_by = login_user.user_id;

    const BssActivityModel = await BssActivity(config_sequelize);
    BssActivityModel.update(activity_details, { where: { activity_uuid } }).then((response) => {
        res.json({
            status: 200,
            success: true,
            message: "Activity Detail Updated successfully!"
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
module.exports.UpdateActivityStatus = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const activity_details = req.body;
    const { activity_uuid, is_activity_activate } = activity_details;
    delete activity_details.activity_uuid;
    activity_details.updated_by = login_user.user_id;

    const BssActivityModel = await BssActivity(config_sequelize);
    BssActivityModel.update(activity_details, { where: { activity_uuid } }).then((response) => {
        res.json({
            status: 200,
            success: true,
            message: `Activity ${is_activity_activate === "true" || is_activity_activate === true ? "Activated" : "Deactivated"} successfully!`
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
module.exports.DeleteActivity = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const activity_details = req.body;
    const { activity_uuid } = activity_details;

    const BssActivityModel = await BssActivity(config_sequelize);
    BssActivityModel.destroy({ where: { activity_uuid }, individualHooks: true, login_user: login_user }).then((response) => {
        res.json({
            status: 200,
            success: true,
            message: `Activity Deleted successfully!`
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
//Travel Mode Api's
module.exports.CreateTravelMode = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const travel_mode_details = req.body;
    travel_mode_details.created_by = login_user.user_id;

    const BssTravelModeModel = await BssTravelMode(config_sequelize);
    BssTravelModeModel.create(travel_mode_details).then((response) => {
        res.json({
            status: 200,
            success: true,
            message: "Mode Of Travel Created successfully!"
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
module.exports.GetAllTravelModes = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const { page, limit, sort, order, search } = req.query;

    let query_data = {};
    let where_data = {};
    if (search) {
        where_data = {
            ...where_data,
            travel_mode_name: { [Sq.Op.iLike]: "%" + search + "%" }
        }

    }

    if (page && limit) {
        query_data.offset = 0 + (page - 1) * limit;
        query_data.limit = limit

    }
    if (sort && order) {
        query_data.order = [[sort, order]]

    }

    const BssTravelModeModel = await BssTravelMode(config_sequelize);
    BssTravelModeModel.findAndCountAll({
        where: where_data, ...query_data
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get All Travel Mode successfully!"
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
module.exports.GetTravelModeById = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const { travel_mode_uuid } = req.query;

    const BssTravelModeModel = await BssTravelMode(config_sequelize);
    BssTravelModeModel.findOne({ where: { travel_mode_uuid } }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Mode of travel by Id successfully!"
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
module.exports.UpdateTravelMode = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const travel_mode_details = req.body;
    const { travel_mode_uuid } = travel_mode_details;
    delete travel_mode_details.travel_mode_uuid;
    travel_mode_details.updated_by = login_user.user_id;

    const BssTravelModeModel = await BssTravelMode(config_sequelize);
    BssTravelModeModel.update(travel_mode_details, { where: { travel_mode_uuid } }).then((response) => {
        res.json({
            status: 200,
            success: true,
            message: "Mode of Travel Detail Updated successfully!"
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
module.exports.UpdateTravelModeStatus = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const travel_mode_details = req.body;
    const { travel_mode_uuid, is_travel_mode_activate } = travel_mode_details;
    delete travel_mode_details.travel_mode_uuid;
    travel_mode_details.updated_by = login_user.user_id;

    const BssTravelModeModel = await BssTravelMode(config_sequelize);
    BssTravelModeModel.update(travel_mode_details, { where: { travel_mode_uuid } }).then((response) => {
        res.json({
            status: 200,
            success: true,
            message: `Mode of Travel ${is_travel_mode_activate === "true" || is_travel_mode_activate === true ? "Activated" : "Deactivated"} successfully!`
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
module.exports.DeleteTravelMode = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const travel_mode_details = req.body;
    const { travel_mode_uuid } = travel_mode_details;

    const BssTravelModeModel = await BssTravelMode(config_sequelize);
    BssTravelModeModel.destroy({ where: { travel_mode_uuid }, individualHooks: true, login_user: login_user }).then((response) => {
        res.json({
            status: 200,
            success: true,
            message: `Mode Of Travel Deleted successfully!`
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

//Leave Reject Reason Api's
module.exports.CreateLeaveRejectReason = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const reject_reason_details = req.body;
    reject_reason_details.created_by = login_user.user_id;

    const BssLeaveRejectReasonsModel = await BssLeaveRejectReasons(config_sequelize);
    BssLeaveRejectReasonsModel.create(reject_reason_details).then((response) => {
        res.json({
            status: 200,
            success: true,
            message: "Leave Reject Reason Created successfully!"
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
module.exports.GetAllLeaveRejectReasons = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const { page, limit, sort, order, search } = req.query;

    let query_data = {};
    let where_data = {};
    if (search) {
        where_data = {
            ...where_data,
            reject_reason: { [Sq.Op.iLike]: "%" + search + "%" }
        }

    }

    if (page && limit) {
        query_data.offset = 0 + (page - 1) * limit;
        query_data.limit = limit

    }
    if (sort && order) {
        query_data.order = [[sort, order]]

    }

    const BssLeaveRejectReasonsModel = await BssLeaveRejectReasons(config_sequelize);
    BssLeaveRejectReasonsModel.findAndCountAll({
        where: where_data, ...query_data
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get All Leave Reject Reasons successfully!"
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
module.exports.GetLeaveRejectReasonById = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const { leave_reject_reason_uuid } = req.query;

    const BssLeaveRejectReasonsModel = await BssLeaveRejectReasons(config_sequelize);
    BssLeaveRejectReasonsModel.findOne({ where: { leave_reject_reason_uuid } }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Leave Reject Reason By Id successfully!"
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
module.exports.UpdateLeaveRejectReason = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const reject_reason_details = req.body;
    const { leave_reject_reason_uuid } = reject_reason_details;
    delete reject_reason_details.leave_reject_reason_uuid;
    reject_reason_details.updated_by = login_user.user_id;

    const BssLeaveRejectReasonsModel = await BssLeaveRejectReasons(config_sequelize);
    BssLeaveRejectReasonsModel.update(reject_reason_details, { where: { leave_reject_reason_uuid } }).then((response) => {
        res.json({
            status: 200,
            success: true,
            message: "Leave Reject Reason Updated successfully!"
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
module.exports.UpdateLeaveRejectStatus = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const reject_reason_details = req.body;
    const { leave_reject_reason_uuid, is_reject_reason_activate } = reject_reason_details;
    delete reject_reason_details.leave_reject_reason_uuid;
    reject_reason_details.updated_by = login_user.user_id;

    const BssLeaveRejectReasonsModel = await BssLeaveRejectReasons(config_sequelize);
    BssLeaveRejectReasonsModel.update(reject_reason_details, { where: { leave_reject_reason_uuid } }).then((response) => {
        res.json({
            status: 200,
            success: true,
            message: `Leave Reject Reason ${is_reject_reason_activate === "true" || is_reject_reason_activate === true ? "Activated" : "Deactivated"} successfully!`
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
module.exports.DeleteLeaveRejectReason = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const reject_reason_details = req.body;
    const { leave_reject_reason_uuid } = reject_reason_details;

    const BssLeaveRejectReasonsModel = await BssLeaveRejectReasons(config_sequelize);
    BssLeaveRejectReasonsModel.destroy({ where: { leave_reject_reason_uuid }, individualHooks: true, login_user: login_user }).then((response) => {
        res.json({
            status: 200,
            success: true,
            message: `Leave Reject Reason Deleted successfully!`
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

module.exports.GetAllStudentsHost = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const { page, limit, sort, order, search_host, search_student, class_id, dormitory_id } = req.query;

    const BssStudentHostModel = await BssStudentHost(config_sequelize);
    const BssHostModel = await BssHost(config_sequelize);

    const BssStudentsModel = await BssStudents(config_sequelize);

    let student_where_data = {};
    let host_where_data = {};
    let query_data = {};

    if (search_student) {
        student_where_data = {
            ...student_where_data,
            [Sq.Op.or]: [
                Sq.where(Sq.fn("concat", Sq.col("student_first_name"), " ", Sq.col("student_last_name")), { [Sq.Op.iLike]: `%${search_student}%` }),
            ],
        };
    };

    if (search_host) {
        host_where_data = {
            ...host_where_data,
            [Sq.Op.or]: [
                Sq.where(Sq.col("host_name"), { [Sq.Op.iLike]: `%${search_host}%` }),
            ],
        };

    };
    if (class_id) {
        student_where_data = {
            ...student_where_data,
            class_id: class_id
        };
    };
    if (dormitory_id) {
        student_where_data = {
            ...student_where_data,
            dormitory_id: dormitory_id
        };

    };
    if (page && limit) {

        query_data.offset = 0 + (page - 1) * limit;
        query_data.limit = limit;

    };
    if (sort && order) {

        query_data.order = [[sort, order]]

    };
    //Create relation at here
    BssStudentHostModel.hasOne(await BssStudentsModel, {
        as: "stu_data", foreignKey: "student_id", sourceKey: "student_id"
    });

    BssStudentHostModel.hasOne(await BssHostModel, {
        as: "host_data", foreignKey: "host_id", sourceKey: "host_id"
    })
    BssStudentHostModel.findAndCountAll(
        {
            attributes: [],
            include: [{
                model: BssHostModel, as: "host_data",
                where: host_where_data,
                attributes: ["host_id", "host_uuid", "host_name", [
                    Sq.fn('PGP_SYM_DECRYPT', Sq.col('host_address'), PG_ENCRYPT_KEY), "host_address"],
                    [
                        Sq.fn('PGP_SYM_DECRYPT', Sq.col('unique_pin'), PG_ENCRYPT_KEY), "unique_pin"
                    ],
                ],
                include: {
                    model: BssStudentHostModel, as: "stu_host", attributes: ["student_host_id", "is_host_approved", "student_host_comment",
                        "host_relation", "host_status"]
                }
            },
            {
                model: BssStudentsModel, as: "stu_data",
                where: student_where_data,
                attributes: ["student_id", "student_uuid", "student_first_name", "student_last_name"]
            }
            ],
            ...query_data
        }
    ).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get All Host successfully!"
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

module.exports.ApproveHost = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const host_details = req.body;
    const { student_host_uuid } = host_details;
    delete host_details.student_host_uuid;
    host_details.updated_by = login_user.user_id;

    const BssStudentHostModel = await BssStudentHost(config_sequelize);
    BssStudentHostModel.update(host_details, { where: { student_host_uuid } }).then((response) => {
        res.json({
            status: 200,
            success: true,
            message: "Student Host Approved successfully!"
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

module.exports.UpdateStudentHostStatus = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const host_details = req.body;
    const { host_id, student_id, host_status } = host_details;
    delete host_details.host_uuid;
    host_details.updated_by = login_user.user_id;

    const BssStudentHostModel = await BssStudentHost(config_sequelize);
    BssStudentHostModel.update(host_details, { where: { host_id, student_id } }).then((response) => {

        res.json({
            status: 200,
            success: true,
            message: `Student Host ${host_status === true || host_status === "true" ? "Activated" : "Deactivated"} successfully!`
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
