"use strict"
const { Op, where, col, cast, fn, literal } = require("sequelize");
const Sq = require("sequelize");
const { DateTime } = require("luxon");
const { getDaysOfWeekNumber, getDatesInRange } = require("../../libs/Helper")
const { BssBorderLeaves, BssStudents, BssDormitories, BssClasses, BssHost, BssStudentHost, BssParents, BssParentAddress, BssStudentAllergy, BssUsers, BssTravelMode, BssLeaveRejectReasons } = require("../Models/common");

module.exports.ApplyBorderLeave = async (req, res) => {
    try {
        const { config_sequelize, login_user, body } = req;
        const border_leave_details = {
            ...body,
            host_id: body.host_id || null,
            parent_id: body.parent_id || null,
            created_by: login_user.user_id
        };
        console.log("hllo world")

        const BssBorderLeavesModel = await BssBorderLeaves(config_sequelize)
        const response = await BssBorderLeavesModel.create(border_leave_details)
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Request For Leave is sent successfully!",
        });
    } catch (error) {
        console.log("error-------------------", error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message:
                "Something went wrong. Please try again or reach out to support if the issue persists.",
        });
    }
}
module.exports.GetAllBorderLeavesDetails = async (req, res) => {
    try {
        const { config_sequelize, query } = req;
        let { search, page, limit, order, sort, from_date, to_date, class_ids, dormitory_ids } = query;

        const BssBorderLeavesModel = await BssBorderLeaves(config_sequelize);
        const BssStudentsModel = await BssStudents(config_sequelize);
        const BssDormitoriesModel = await BssDormitories(config_sequelize);
        const BssClassesModel = await BssClasses(config_sequelize);
        const BssHostModel = await BssHost(config_sequelize);
        const BssParentsModel = await BssParents(config_sequelize);
        const BssTravelModel = await BssTravelMode(config_sequelize);
        const BssLeaveRejectReasonsModel = await BssLeaveRejectReasons(config_sequelize);

        let where_data = { is_leave_archived: false };

        /* Pagination */
        const offset = page && limit ? (page - 1) * limit : 0;
        const limitPerPage = page && limit ? limit : 10;

        /* Sorting */
        const orderCriteria = sort && order ? [[sort, order]] : [];

        // /* Date Filtering */
        // const dateQuery = {};
        // if (from_date) {
        //     dateQuery[Op.gte] =DateTime.fromFormat(from_date, "yyyy-MM-dd").startOf('day').toUTC().toISO()
        //     // dateQuery[Op.gte] =DateTime.fromFormat(from_date, "yyyy-MM-dd").startOf('day').toUTC().toISO()
        // }
        // if (to_date) {
        //     dateQuery[Op.lte] = DateTime.fromFormat(to_date, "yyyy-MM-dd").endOf('day').toUTC().toISO()
        // }
        // if (Object.getOwnPropertySymbols(dateQuery).length > 0) {
        //     where_data.departure_date = dateQuery;
        // }


        const dateQuery = {};
        if (from_date && to_date) {
            dateQuery[Op.and] = [
                {
                    departure_date: {
                        [Op.gte]: DateTime.fromFormat(from_date, "yyyy-MM-dd")
                            .startOf('day')
                            .toUTC()
                            .toISO(),
                    },
                },
                {
                    return_date: {
                        [Op.lte]: DateTime.fromFormat(to_date, "yyyy-MM-dd")
                            .endOf('day')
                            .toUTC()
                            .toISO(),
                    },
                },
            ];
        } else if (from_date) {
            dateQuery.departure_date = {
                [Op.gte]: DateTime.fromFormat(from_date, "yyyy-MM-dd")
                    .startOf('day')
                    .toUTC()
                    .toISO(),
            };
        } else if (to_date) {
            dateQuery.return_date = {
                [Op.lte]: DateTime.fromFormat(to_date, "yyyy-MM-dd")
                    .endOf('day')
                    .toUTC()
                    .toISO(),
            };
        }

        if (Object.getOwnPropertySymbols(dateQuery).length > 0) {
            where_data[Op.and] = [dateQuery];
        }

        if (class_ids) {
            where_data.class_id = class_ids;
        }
        if (dormitory_ids) {
            where_data.dormitory_id = dormitory_ids;
        }
        /* Search Filtering */
        // if (search) {
        //     const searchCriteria = {
        //         [Op.or]: [
        //             col('remarks_by_host'),
        //             col('departure_date'),
        //             col('departure_time'),
        //             cast(col('is_parent_approval'), 'varchar'),
        //             cast(col('is_user_approval'), 'varchar')
        //         ].map(field => literal(`"${field}" ILIKE '%${search}%'`))
        //     };
        //     where_data[Op.and] = searchCriteria;
        // }

        if (search) {
            where_data[Op.or] = [
                where(col('remarks_by_host'), { [Op.iLike]: `%${search}%` }),
                where(col('departure_date'), { [Op.iLike]: `%${search}%` }),
                where(col('departure_time'), { [Op.iLike]: `%${search}%` }),
                where(cast(col('is_parent_approval'), 'varchar'), { [Op.iLike]: search }),
                where(cast(col('is_user_approval'), 'varchar'), { [Op.iLike]: `%${search}%` }),
            ];
        }

        /* Fetch Data */
        BssStudentsModel.hasOne(await BssClassesModel, {
            as: "stu_class_data",
            foreignKey: "class_id",
            sourceKey: "class_id"
        });

        console.log("whwre------------", where_data)
        const response = await BssBorderLeavesModel.findAndCountAll({
            where: where_data,
            attributes: {
                exclude: ["created_by", "updated_by", "deleted_by", "updated_date", "deleted_date"]
            },
            include: [
                {
                    model: BssStudentsModel,
                    as: 'leave_stu_data',
                    attributes: [
                        [fn("concat", col("student_first_name"), " ", col("student_last_name")), "student_name"],
                        [fn('PGP_SYM_DECRYPT', col('leave_stu_data.student_email'), PG_ENCRYPT_KEY), "student_email"],
                        [fn('PGP_SYM_DECRYPT', col('leave_stu_data.unique_pin'), PG_ENCRYPT_KEY), "unique_pin"]
                    ],
                    include: [
                        {
                            model: BssDormitoriesModel,
                            as: 'dormitory_data',
                            attributes: [
                                [fn('PGP_SYM_DECRYPT', col('leave_stu_data.dormitory_data.dormitory_name'), PG_ENCRYPT_KEY), "dormitory_name"]
                            ]
                        },
                        {
                            model: BssClassesModel,
                            as: 'stu_class_data',
                            attributes: [
                                "class_name"
                            ]
                        },
                    ]
                },
                {
                    model: BssHostModel,
                    as: 'stu_host_data',
                    attributes: [
                        "host_name"
                    ]
                },
                {
                    model: BssParentsModel,
                    as: 'parent_data',
                    attributes: [
                        "father_name", "mother_name"
                    ]
                },
                {
                    model: BssTravelModel,
                    as: 'departure_mode_data',
                    attributes: [
                        "travel_mode_name"
                    ],
                },
                {
                    model: BssTravelModel,
                    as: 'return_mode_data',
                    attributes: [
                        "travel_mode_name"
                    ],
                },
                {
                    model: BssLeaveRejectReasonsModel,
                    as: 'parent_rejected_reason_data',
                    attributes: [
                        "reject_reason"
                    ],
                },
                {
                    model: BssLeaveRejectReasonsModel,
                    as: 'user_rejected_reason_data',
                    attributes: [
                        "reject_reason"
                    ],
                }
            ],
            distinct: true,
            offset,
            limit: limitPerPage,
            order: orderCriteria
        });

        /* Counts */
        const user_approval_counts = await BssBorderLeavesModel.findAll({
            where: where_data,
            attributes: [
                [
                    fn('COUNT', literal(`CASE WHEN is_user_approval = 'approved' THEN 1 ELSE NULL END`)),
                    'total_approved'
                ],
                [
                    fn('COUNT', literal(`CASE WHEN  is_user_approval = 'rejected' THEN 1 ELSE NULL END`)),
                    'total_rejected'
                ],
                [
                    fn('COUNT', literal(`CASE WHEN is_user_approval = 'pending' THEN 1 ELSE NULL END`)),
                    'total_pending'
                ]
            ]
        });

        res.status(200).json({
            success: true,
            data: response,
            user_approval_counts,
            message: "Get All Leave Details successfully!"
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            error: error,
            message: "Something went wrong. Please try again or contact support if the issue persists."
        });
    }
};

module.exports.GetBorderLeavesDetailById = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;
        const BssBorderLeavesModel = await BssBorderLeaves(config_sequelize)
        const BssStudentsModel = await BssStudents(config_sequelize);
        const BssDormitoriesModel = await BssDormitories(config_sequelize);
        const BssClassesModel = await BssClasses(config_sequelize);
        const BssHostModel = await BssHost(config_sequelize);
        const BssParentsModel = await BssParents(config_sequelize);
        const BssParentAddressModel = await BssParentAddress(config_sequelize);
        const BssTravelModel = await BssTravelMode(config_sequelize);
        const BssLeaveRejectReasonsModel = await BssLeaveRejectReasons(config_sequelize);
        const BssStudentHostModel = await BssStudentHost(config_sequelize);
        const { border_leave_id } = req.query;
        BssStudentsModel.hasOne(await BssClassesModel, {
            as: "stu_class_data", foreignKey: "class_id", sourceKey: "class_id"

        });
        const response = await BssBorderLeavesModel.findOne({
            where: { border_leave_id },
            attributes: { exclude: ["created_by", "updated_by", "deleted_by", "updated_date", "deleted_date"] }
            , include: [
                {
                    model: BssStudentsModel,
                    as: 'leave_stu_data',
                    attributes: [
                        [fn("concat", col("student_first_name"), " ", col("student_last_name")), "student_name"],
                        [fn('PGP_SYM_DECRYPT', col('leave_stu_data.student_email'), PG_ENCRYPT_KEY), "student_email"]
                    ],
                    include: [{
                        model: BssDormitoriesModel,
                        as: 'dormitory_data',
                        attributes: [
                            [fn('PGP_SYM_DECRYPT', col('leave_stu_data.dormitory_data.dormitory_name'), PG_ENCRYPT_KEY), "dormitory_name"]

                        ]
                    },
                    {
                        model: BssClassesModel,
                        as: 'stu_class_data',
                        attributes: [
                            "class_name"
                        ]
                    },
                    ]
                },
                {
                    model: BssHostModel,
                    as: 'stu_host_data',
                    attributes: [
                        "host_name",
                        [fn('PGP_SYM_DECRYPT', col('stu_host_data.host_contact'), PG_ENCRYPT_KEY), "host_contact"],
                        [fn('PGP_SYM_DECRYPT', col('stu_host_data.host_address'), PG_ENCRYPT_KEY), "host_address"],

                    ],
                    include: {
                        model: BssStudentHostModel, as: "stu_host",
                        attributes: ["student_host_uuid", "is_host_approved", "student_host_comment", "host_relation", "host_status"],
                        where: { is_host_approved: true },
                    }
                },
                {
                    model: BssParentsModel,
                    as: 'parent_data',
                    attributes: [
                        "father_name", "mother_name",
                        [fn('PGP_SYM_DECRYPT', col('parent_data.father_phone'), PG_ENCRYPT_KEY), "father_phone"],
                        [fn('PGP_SYM_DECRYPT', col('parent_data.mother_phone'), PG_ENCRYPT_KEY), "mother_phone"],
                    ],

                    include: [{
                        model: BssParentAddressModel,
                        as: 'parent_address',
                        attributes: [
                            [fn('PGP_SYM_DECRYPT', col('parent_data.parent_address.address_line1'), PG_ENCRYPT_KEY), "address_line1"]
                        ]
                    },
                    {
                        model: BssStudentHostModel, as: "parents_as_host", attributes: ["student_host_uuid", "student_host_id", "parent_id", "parent_type",
                            "host_relation"]
                    }
                    ]

                },
                {
                    model: BssTravelModel,
                    as: 'departure_mode_data',
                    attributes: [
                        "travel_mode_name"
                    ],
                },
                {
                    model: BssTravelModel,
                    as: 'return_mode_data',
                    attributes: [
                        "travel_mode_name"
                    ],
                },
                {
                    model: BssLeaveRejectReasonsModel,
                    as: 'parent_rejected_reason_data',
                    attributes: [
                        "reject_reason"
                    ],
                },
                {
                    model: BssLeaveRejectReasonsModel,
                    as: 'user_rejected_reason_data',
                    attributes: [
                        "reject_reason"
                    ],
                }
            ],
        })
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Border Leave Details by Id successfully!",
        });
    } catch (error) {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message:
                "Something went wrong. Please try again or reach out to support if the issue persists.",
        });
    }
}
module.exports.UpdateBorderLeavesDetails = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;
        const BssBorderLeavesModel = await BssBorderLeaves(config_sequelize)
        const { border_leave_id, ...border_leave_details } = req.body;
        const response = await BssBorderLeavesModel.update(border_leave_details, {
            where: { border_leave_id }
        })
        res.json({
            status: 200,
            success: true,
            data: response,
            message: `Border Leave detail updated successfully!`
        });
    } catch (error) {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message:
                "Something went wrong. Please try again or reach out to support if the issue persists.",
        });
    }
}

module.exports.BorderLeaveApproval = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;
        const login_user = req.login_user;
        const { user_id, user_school: { timezone } } = login_user
        const { border_leave_id, modal_mode, ...border_leave_details } = req.body;

        console.log("")
        // border_leave_details.last_parent_approval_date  = (modal_mode === 'parent') ? DateTime.utc().setZone(timezone).toISO() : border_leave_details.last_parent_approval_date
        if (modal_mode === 'parent') {
            const propertiesToDelete = ['is_user_approval', 'user_approved_comments', 'user_rejected_reason_id'];
            for (const prop of propertiesToDelete) {
                if (border_leave_details.hasOwnProperty(prop)) {
                    delete border_leave_details[prop];
                }
            }
            border_leave_details.last_parent_approval_date = DateTime.utc().setZone(timezone).toISO()
        }
        if (modal_mode === 'user') {
            const propertiesToDelete = ['is_parent_approval', 'parent_approved_comments', 'parent_rejected_reason_id'];
            for (const prop of propertiesToDelete) {
                if (border_leave_details.hasOwnProperty(prop)) {
                    delete border_leave_details[prop];
                }
            }
            border_leave_details.last_user_approval_date = DateTime.utc().setZone(timezone).toISO()
            border_leave_details.approval_by_user = user_id
        }
        const BssBorderLeavesModel = await BssBorderLeaves(config_sequelize)
        const response = await BssBorderLeavesModel.update(border_leave_details, {
            where: { border_leave_id }
        })
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Approval for Border Leave Request is sent successfully!",
        });
    } catch (error) {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message:
                "Something went wrong. Please try again or reach out to support if the issue persists.",
        });
    }
}

module.exports.ArchiveOrUnarchiveBorderLeave = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;
        let { border_leave_id, is_leave_archived } = req.body;
        const login_user = req.login_user;
        const { user_id, user_school: { timezone } } = login_user
        // const last_archived_date = DateTime.utc().setZone(timezone).toFormat('yyyy-MM-dd HH:mm a');
        const BssBorderLeavesModel = await BssBorderLeaves(config_sequelize)
        const response = await BssBorderLeavesModel.update({
            is_leave_archived,
            archived_by: user_id,
            last_archived_date: DateTime.utc().setZone(timezone).toISO()
        }, {
            where: { border_leave_id }
        })
        console.log("is_leave_archived-------", is_leave_archived)
        res.json({
            status: 200,
            success: true,
            data: response,
            message: await `Border Leave has been ${is_leave_archived == true || is_leave_archived == "true" ? 'Archived' : 'UnArchived'} successfully!`,
        });
    } catch (error) {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message:
                "Something went wrong. Please try again or reach out to support if the issue persists.",
        });
    }
}


module.exports.GetApprovedStudentHost = async (req, res) => {
    try {

        const config_sequelize = req.config_sequelize;
        const { student_id } = req.query;
        const BssUsersModel = await BssUsers(config_sequelize);
        const BssDormitoriesModel = await BssDormitories(config_sequelize);
        const BssStudentsModel = await BssStudents(config_sequelize);
        const BssStudentAllergyModel = await BssStudentAllergy(config_sequelize);
        const BssParentAddressModel = await BssParentAddress(config_sequelize);
        const BssHostModel = await BssHost(config_sequelize);
        const BssStudentHostModel = await BssStudentHost(config_sequelize);
        const response = await BssStudentsModel.findOne({
            where: { student_id },
            attributes: ['student_id', 'student_uuid', 'student_first_name', 'student_last_name'],
            include: [{
                model: await BssParents(config_sequelize), as: "parent_data",
                attributes: [
                    "father_name", "mother_name", "parent_uuid", "parent_id",
                ],
                include: [{
                    model: BssParentAddressModel, as: "parent_address",
                    attributes: ["parent_address_id", "parent_address_type", "parent_country"]
                },
                {
                    model: BssStudentHostModel, as: "parents_as_host", attributes: ["student_host_uuid", "student_host_id", "parent_id", "parent_type",
                        "host_relation"]
                }
                ]
            },
            {
                model: BssHostModel, as: "stu_host_data",
                attributes: ["host_id", "host_uuid", "host_name", "remark_parents", "remark_boarding", "remark_host",
                    [Sq.fn('PGP_SYM_DECRYPT', Sq.col('host_email'), PG_ENCRYPT_KEY), "host_email"],
                    [Sq.fn('PGP_SYM_DECRYPT', Sq.col('host_contact'), PG_ENCRYPT_KEY), "host_contact"],
                    [Sq.fn('PGP_SYM_DECRYPT', Sq.col('host_address'), PG_ENCRYPT_KEY), "host_address"],
                ],
                through: {
                    attributes: [],
                },
                include: {
                    model: BssStudentHostModel, as: "stu_host",
                    attributes: ["student_host_uuid", "is_host_approved", "student_host_comment", "host_relation", "host_status"],
                    where: { is_host_approved: true },
                }
            },
            ],
        })
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Approved Student Host Details successfully!"
        })

    } catch (error) {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message:
                "Something went wrong. Please try again or reach out to support if the issue persists.",
        });
    }
}

module.exports.GetArchiveStudentDetails = async (req, res) => {
    try {
        const { config_sequelize, query } = req;
        let { search, page, limit, order, sort, from_date, to_date, class_ids, dormitory_ids } = query;

        const BssBorderLeavesModel = await BssBorderLeaves(config_sequelize);
        const BssStudentsModel = await BssStudents(config_sequelize);
        const BssDormitoriesModel = await BssDormitories(config_sequelize);
        const BssClassesModel = await BssClasses(config_sequelize);
        const BssHostModel = await BssHost(config_sequelize);
        const BssParentsModel = await BssParents(config_sequelize);
        const BssTravelModel = await BssTravelMode(config_sequelize);
        const BssLeaveRejectReasonsModel = await BssLeaveRejectReasons(config_sequelize);

        let where_data = { is_leave_archived: true };

        /* Pagination */
        const offset = page && limit ? (page - 1) * limit : 0;
        const limitPerPage = page && limit ? limit : 10;

        /* Sorting */
        const orderCriteria = sort && order ? [[sort, order]] : [];
        /* Fetch Data */
        BssStudentsModel.hasOne(await BssClassesModel, {
            as: "stu_class_data",
            foreignKey: "class_id",
            sourceKey: "class_id"
        });

        console.log("whwre------------", where_data)
        const response = await BssBorderLeavesModel.findAndCountAll({
            where: where_data,
            attributes: {
                exclude: ["created_by", "updated_by", "deleted_by", "updated_date", "deleted_date"]
            },
            include: [
                {
                    model: BssStudentsModel,
                    as: 'leave_stu_data',
                    attributes: [
                        [fn("concat", col("student_first_name"), " ", col("student_last_name")), "student_name"],
                        [fn('PGP_SYM_DECRYPT', col('leave_stu_data.student_email'), PG_ENCRYPT_KEY), "student_email"],
                        [fn('PGP_SYM_DECRYPT', col('leave_stu_data.unique_pin'), PG_ENCRYPT_KEY), "unique_pin"]
                    ],
                    include: [
                        {
                            model: BssDormitoriesModel,
                            as: 'dormitory_data',
                            attributes: [
                                [fn('PGP_SYM_DECRYPT', col('leave_stu_data.dormitory_data.dormitory_name'), PG_ENCRYPT_KEY), "dormitory_name"]
                            ]
                        },
                        {
                            model: BssClassesModel,
                            as: 'stu_class_data',
                            attributes: [
                                "class_name"
                            ]
                        },
                    ]
                },
                {
                    model: BssHostModel,
                    as: 'stu_host_data',
                    attributes: [
                        "host_name"
                    ]
                },
                {
                    model: BssParentsModel,
                    as: 'parent_data',
                    attributes: [
                        "father_name", "mother_name"
                    ]
                },
                {
                    model: BssTravelModel,
                    as: 'departure_mode_data',
                    attributes: [
                        "travel_mode_name"
                    ],
                },
                {
                    model: BssTravelModel,
                    as: 'return_mode_data',
                    attributes: [
                        "travel_mode_name"
                    ],
                },
                {
                    model: BssLeaveRejectReasonsModel,
                    as: 'parent_rejected_reason_data',
                    attributes: [
                        "reject_reason"
                    ],
                },
                {
                    model: BssLeaveRejectReasonsModel,
                    as: 'user_rejected_reason_data',
                    attributes: [
                        "reject_reason"
                    ],
                }
            ],
            distinct: true,
            offset,
            limit: limitPerPage,
            order: orderCriteria
        });

        /* Counts */
        const user_approval_counts = await BssBorderLeavesModel.findAll({
            where: where_data,
            attributes: [
                [
                    fn('COUNT', literal(`CASE WHEN is_user_approval = 'approved' THEN 1 ELSE NULL END`)),
                    'total_approved'
                ],
                [
                    fn('COUNT', literal(`CASE WHEN  is_user_approval = 'rejected' THEN 1 ELSE NULL END`)),
                    'total_rejected'
                ],
                [
                    fn('COUNT', literal(`CASE WHEN is_user_approval = 'pending' THEN 1 ELSE NULL END`)),
                    'total_pending'
                ]
            ]
        });

        res.status(200).json({
            success: true,
            data: response,
            user_approval_counts,
            message: "Get All Leave Details successfully!"
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            error: error,
            message: "Something went wrong. Please try again or contact support if the issue persists."
        });
    }
};

module.exports.GetDepartureStudentDetails = async (req, res) => {
    try {
        const { config_sequelize, query } = req;
        let { search, page, limit, order, sort, from_date, to_date, class_ids, dormitory_ids } = query;

        const BssBorderLeavesModel = await BssBorderLeaves(config_sequelize);
        const BssStudentsModel = await BssStudents(config_sequelize);
        const BssDormitoriesModel = await BssDormitories(config_sequelize);
        const BssClassesModel = await BssClasses(config_sequelize);
        const BssHostModel = await BssHost(config_sequelize);
        const BssParentsModel = await BssParents(config_sequelize);
        const BssTravelModel = await BssTravelMode(config_sequelize);
        const BssLeaveRejectReasonsModel = await BssLeaveRejectReasons(config_sequelize);

        // Get the current date and time
        const currentDate = DateTime.local();
        // Format the current date as a string in a specific format
        const formattedDate = currentDate.toFormat('yyyy-MM-dd HH:mm:ss');

        console.log(formattedDate); // Output the formatted date and time

        let where_data = {
            is_leave_archived: false, is_user_approval: 'approved',
            departure_date: { [Op.gte]: formattedDate },
            return_date: { [Op.lte]: formattedDate }
        };

        /* Pagination */
        const offset = page && limit ? (page - 1) * limit : 0;
        const limitPerPage = page && limit ? limit : 10;

        /* Sorting */
        const orderCriteria = sort && order ? [[sort, order]] : [];

        const dateQuery = {};
        if (from_date && to_date) {
            dateQuery[Op.and] = [
                {
                    departure_date: {
                        [Op.gte]: DateTime.fromFormat(from_date, "yyyy-MM-dd")
                            .startOf('day')
                            .toUTC()
                            .toISO(),
                    },
                },
                {
                    return_date: {
                        [Op.lte]: DateTime.fromFormat(to_date, "yyyy-MM-dd")
                            .endOf('day')
                            .toUTC()
                            .toISO(),
                    },
                },
            ];
        } else if (from_date) {
            dateQuery.departure_date = {
                [Op.gte]: DateTime.fromFormat(from_date, "yyyy-MM-dd")
                    .startOf('day')
                    .toUTC()
                    .toISO(),
            };
        } else if (to_date) {
            dateQuery.return_date = {
                [Op.lte]: DateTime.fromFormat(to_date, "yyyy-MM-dd")
                    .endOf('day')
                    .toUTC()
                    .toISO(),
            };
        }

        if (Object.getOwnPropertySymbols(dateQuery).length > 0) {
            where_data[Op.and] = [dateQuery];
        }

        if (class_ids) {
            where_data.class_id = class_ids;
        }
        if (dormitory_ids) {
            where_data.dormitory_id = dormitory_ids;
        }

        if (search) {
            where_data[Op.or] = [
                where(col('remarks_by_host'), { [Op.iLike]: `%${search}%` }),
                where(col('departure_date'), { [Op.iLike]: `%${search}%` }),
                where(col('departure_time'), { [Op.iLike]: `%${search}%` }),
                where(cast(col('is_parent_approval'), 'varchar'), { [Op.iLike]: search }),
                where(cast(col('is_user_approval'), 'varchar'), { [Op.iLike]: `%${search}%` }),
            ];
        }

        /* Fetch Data */
        BssStudentsModel.hasOne(await BssClassesModel, {
            as: "stu_class_data",
            foreignKey: "class_id",
            sourceKey: "class_id"
        });

        console.log("whwre------------", where_data)
        const response = await BssBorderLeavesModel.findAndCountAll({
            where: where_data,
            attributes: {
                exclude: ["created_by", "updated_by", "deleted_by", "updated_date", "deleted_date"]
            },
            include: [
                {
                    model: BssStudentsModel,
                    as: 'leave_stu_data',
                    attributes: [
                        [fn("concat", col("student_first_name"), " ", col("student_last_name")), "student_name"],
                        [fn('PGP_SYM_DECRYPT', col('leave_stu_data.student_email'), PG_ENCRYPT_KEY), "student_email"],
                        [fn('PGP_SYM_DECRYPT', col('leave_stu_data.unique_pin'), PG_ENCRYPT_KEY), "unique_pin"]
                    ],
                    include: [
                        {
                            model: BssDormitoriesModel,
                            as: 'dormitory_data',
                            attributes: [
                                [fn('PGP_SYM_DECRYPT', col('leave_stu_data.dormitory_data.dormitory_name'), PG_ENCRYPT_KEY), "dormitory_name"]
                            ]
                        },
                        {
                            model: BssClassesModel,
                            as: 'stu_class_data',
                            attributes: [
                                "class_name"
                            ]
                        },
                    ]
                },
                {
                    model: BssHostModel,
                    as: 'stu_host_data',
                    attributes: [
                        "host_name"
                    ]
                },
                {
                    model: BssParentsModel,
                    as: 'parent_data',
                    attributes: [
                        "father_name", "mother_name"
                    ]
                },
                {
                    model: BssTravelModel,
                    as: 'departure_mode_data',
                    attributes: [
                        "travel_mode_name"
                    ],
                },
                {
                    model: BssTravelModel,
                    as: 'return_mode_data',
                    attributes: [
                        "travel_mode_name"
                    ],
                },
                {
                    model: BssLeaveRejectReasonsModel,
                    as: 'parent_rejected_reason_data',
                    attributes: [
                        "reject_reason"
                    ],
                },
                {
                    model: BssLeaveRejectReasonsModel,
                    as: 'user_rejected_reason_data',
                    attributes: [
                        "reject_reason"
                    ],
                }
            ],
            distinct: true,
            offset,
            limit: limitPerPage,
            order: orderCriteria
        });

        /* Counts */
        const user_approval_counts = await BssBorderLeavesModel.findAll({
            where: where_data,
            attributes: [
                [
                    fn('COUNT', literal(`CASE WHEN is_user_approval = 'approved' THEN 1 ELSE NULL END`)),
                    'total_approved'
                ],
                [
                    fn('COUNT', literal(`CASE WHEN  is_user_approval = 'rejected' THEN 1 ELSE NULL END`)),
                    'total_rejected'
                ],
                [
                    fn('COUNT', literal(`CASE WHEN is_user_approval = 'pending' THEN 1 ELSE NULL END`)),
                    'total_pending'
                ]
            ]
        });

        res.status(200).json({
            success: true,
            data: response,
            user_approval_counts,
            message: "Get All Leave Details successfully!"
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            error: error,
            message: "Something went wrong. Please try again or contact support if the issue persists."
        });
    }
};
module.exports.GetReturnStudentDetails = async (req, res) => {
    try {
        const { config_sequelize, query } = req;
        let { search, page, limit, order, sort, from_date, to_date, class_ids, dormitory_ids } = query;

        const BssBorderLeavesModel = await BssBorderLeaves(config_sequelize);
        const BssStudentsModel = await BssStudents(config_sequelize);
        const BssDormitoriesModel = await BssDormitories(config_sequelize);
        const BssClassesModel = await BssClasses(config_sequelize);
        const BssHostModel = await BssHost(config_sequelize);
        const BssParentsModel = await BssParents(config_sequelize);
        const BssTravelModel = await BssTravelMode(config_sequelize);
        const BssLeaveRejectReasonsModel = await BssLeaveRejectReasons(config_sequelize);

        // Get the current date and time
        const currentDate = DateTime.local();
        // Format the current date as a string in a specific format
        const formattedDate = currentDate.toFormat('yyyy-MM-dd HH:mm:ss');

        console.log(formattedDate); // Output the formatted date and time

        let where_data = {
            is_leave_archived: false, is_user_approval: 'approved',
            return_date: { [Op.gt]: formattedDate }
        };

        /* Pagination */
        const offset = page && limit ? (page - 1) * limit : 0;
        const limitPerPage = page && limit ? limit : 10;

        /* Sorting */
        const orderCriteria = sort && order ? [[sort, order]] : [];

        const dateQuery = {};
        if (from_date && to_date) {
            dateQuery[Op.and] = [
                {
                    departure_date: {
                        [Op.gte]: DateTime.fromFormat(from_date, "yyyy-MM-dd")
                            .startOf('day')
                            .toUTC()
                            .toISO(),
                    },
                },
                {
                    return_date: {
                        [Op.lte]: DateTime.fromFormat(to_date, "yyyy-MM-dd")
                            .endOf('day')
                            .toUTC()
                            .toISO(),
                    },
                },
            ];
        } else if (from_date) {
            dateQuery.departure_date = {
                [Op.gte]: DateTime.fromFormat(from_date, "yyyy-MM-dd")
                    .startOf('day')
                    .toUTC()
                    .toISO(),
            };
        } else if (to_date) {
            dateQuery.return_date = {
                [Op.lte]: DateTime.fromFormat(to_date, "yyyy-MM-dd")
                    .endOf('day')
                    .toUTC()
                    .toISO(),
            };
        }

        if (Object.getOwnPropertySymbols(dateQuery).length > 0) {
            where_data[Op.and] = [dateQuery];
        }

        if (class_ids) {
            where_data.class_id = class_ids;
        }
        if (dormitory_ids) {
            where_data.dormitory_id = dormitory_ids;
        }

        if (search) {
            where_data[Op.or] = [
                where(col('remarks_by_host'), { [Op.iLike]: `%${search}%` }),
                where(col('departure_date'), { [Op.iLike]: `%${search}%` }),
                where(col('departure_time'), { [Op.iLike]: `%${search}%` }),
                where(cast(col('is_parent_approval'), 'varchar'), { [Op.iLike]: search }),
                where(cast(col('is_user_approval'), 'varchar'), { [Op.iLike]: `%${search}%` }),
            ];
        }

        /* Fetch Data */
        BssStudentsModel.hasOne(await BssClassesModel, {
            as: "stu_class_data",
            foreignKey: "class_id",
            sourceKey: "class_id"
        });

        console.log("whwre------------", where_data)
        const response = await BssBorderLeavesModel.findAndCountAll({
            where: where_data,
            attributes: {
                exclude: ["created_by", "updated_by", "deleted_by", "updated_date", "deleted_date"]
            },
            include: [
                {
                    model: BssStudentsModel,
                    as: 'leave_stu_data',
                    attributes: [
                        [fn("concat", col("student_first_name"), " ", col("student_last_name")), "student_name"],
                        [fn('PGP_SYM_DECRYPT', col('leave_stu_data.student_email'), PG_ENCRYPT_KEY), "student_email"],
                        [fn('PGP_SYM_DECRYPT', col('leave_stu_data.unique_pin'), PG_ENCRYPT_KEY), "unique_pin"]
                    ],
                    include: [
                        {
                            model: BssDormitoriesModel,
                            as: 'dormitory_data',
                            attributes: [
                                [fn('PGP_SYM_DECRYPT', col('leave_stu_data.dormitory_data.dormitory_name'), PG_ENCRYPT_KEY), "dormitory_name"]
                            ]
                        },
                        {
                            model: BssClassesModel,
                            as: 'stu_class_data',
                            attributes: [
                                "class_name"
                            ]
                        },
                    ]
                },
                {
                    model: BssHostModel,
                    as: 'stu_host_data',
                    attributes: [
                        "host_name"
                    ]
                },
                {
                    model: BssParentsModel,
                    as: 'parent_data',
                    attributes: [
                        "father_name", "mother_name"
                    ]
                },
                {
                    model: BssTravelModel,
                    as: 'departure_mode_data',
                    attributes: [
                        "travel_mode_name"
                    ],
                },
                {
                    model: BssTravelModel,
                    as: 'return_mode_data',
                    attributes: [
                        "travel_mode_name"
                    ],
                },
                {
                    model: BssLeaveRejectReasonsModel,
                    as: 'parent_rejected_reason_data',
                    attributes: [
                        "reject_reason"
                    ],
                },
                {
                    model: BssLeaveRejectReasonsModel,
                    as: 'user_rejected_reason_data',
                    attributes: [
                        "reject_reason"
                    ],
                }
            ],
            distinct: true,
            offset,
            limit: limitPerPage,
            order: orderCriteria
        });

        /* Counts */
        const user_approval_counts = await BssBorderLeavesModel.findAll({
            where: where_data,
            attributes: [
                [
                    fn('COUNT', literal(`CASE WHEN is_user_approval = 'approved' THEN 1 ELSE NULL END`)),
                    'total_approved'
                ],
                [
                    fn('COUNT', literal(`CASE WHEN  is_user_approval = 'rejected' THEN 1 ELSE NULL END`)),
                    'total_rejected'
                ],
                [
                    fn('COUNT', literal(`CASE WHEN is_user_approval = 'pending' THEN 1 ELSE NULL END`)),
                    'total_pending'
                ]
            ]
        });

        res.status(200).json({
            success: true,
            data: response,
            user_approval_counts,
            message: "Get All Leave Details successfully!"
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            error: error,
            message: "Something went wrong. Please try again or contact support if the issue persists."
        });
    }
};

module.exports.ManageBoarderLeaveDashboard = async (req, res) => {
    try {
        const { config_sequelize } = req;
        const BssBorderLeavesModel = await BssBorderLeaves(config_sequelize);

        // Get the current date and time
        const currentDate = DateTime.local();
        // Format the current date as a string in a specific format
        const formattedDate = currentDate.toFormat('yyyy-MM-dd HH:mm:ss');

        console.log(formattedDate); // Output the formatted date and time

        // Use Promise.all to execute queries concurrently
        const [studentsOnLeaveToday, newLeaveRequestsToday, studentsReturningToday] = await Promise.all([
            BssBorderLeavesModel.count({
                where: {
                    departure_date: {
                        [Op.eq]: formattedDate,
                    },
                },
            }),
            BssBorderLeavesModel.count({
                where: {
                    departure_date: {
                        [Op.eq]: formattedDate,
                    },
                    is_user_approval: 'pending',
                },
            }),
            BssBorderLeavesModel.count({
                where: {
                    return_date: {
                        [Op.eq]: formattedDate,
                    },
                },
            }),
        ]);

        const [newLeaveRequestsData] = await Promise.all([

            BssBorderLeavesModel.findAll({
                where: {
                    departure_date: {
                        [Op.gte]: formattedDate,
                    },
                    is_user_approval: 'pending',
                },
            }),
            // BssBorderLeavesModel.count({
            //     where: {
            //         return_date: {
            //             [Op.eq]: formattedDate,
            //         },
            //     },
            // }),
        ]);
        // Respond with the data in JSON format
        const response = {
            studentsOnLeaveToday,
            newLeaveRequestsToday,
            studentsReturningToday,
        };

        res.status(200).json({
            success: true,
            data: response,
            message: "Get Boarder Leave Dashboard Details successfully!"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: "Something went wrong. Please try again or contact support if the issue persists."
        });
    }
};


module.exports.DepartureStudentApproval = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;
        const login_user = req.login_user;
        const { user_id, user_school: { timezone } } = login_user
        const { border_leave_id, student_id, ...border_leave_details } = req.body;
        border_leave_details.last_departed_date = DateTime.utc().setZone(timezone).toISO()
        border_leave_details.departed_by_user = user_id
        

        const BssBorderLeavesModel = await BssBorderLeaves(config_sequelize)
        const response = await BssBorderLeavesModel.update(border_leave_details, {
            where: { border_leave_id, student_id }
        })
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Approval for Border Leave Request is sent successfully!",
        });
    } catch (error) {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message:
                "Something went wrong. Please try again or reach out to support if the issue persists.",
        });
    }
}

   module.exports.DepartureStudentScheduleChange = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;
        const login_user = req.login_user;
        const { user_id, user_school: { timezone } } = login_user
        const { border_leave_id, student_id, ...border_leave_details } = req.body;
        border_leave_details.last_schedule_changed_date = DateTime.utc().setZone(timezone).toISO()
        border_leave_details.schedule_changed_by_user = user_id
        const BssBorderLeavesModel = await BssBorderLeaves(config_sequelize)
        const response = await BssBorderLeavesModel.update(border_leave_details,{
            where: { border_leave_id, student_id }
        })
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Approval for Border Leave Request is sent successfully!",
        });
    } catch (error) {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message:
                "Something went wrong. Please try again or reach out to support if the issue persists.",
        });
    }
}