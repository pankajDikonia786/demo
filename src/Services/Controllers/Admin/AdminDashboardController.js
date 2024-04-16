const Sq = require("sequelize");
const { SchoolDetails, Users, UserLoginInfo } = require("../../Models/admin");


module.exports.GetAllDashboardSchools = async (req, res) => {
    const { page, limit, order, sort, search } = req.query;
    let query_object = {};
    let where_object = {};
    if (search) {
        where_object = {
            ...where_object,
            school_name: Sq.where(Sq.fn("LOWER", Sq.col("school_name"),), "LIKE", "%" + search.toLowerCase() + "%")
            // Sq.where(Sq.fn('LOWER', Sq.col('user_message_title')), { [Sq.Op.iLike]: `%${search.toLowerCase()}%` })
        }
    }

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
    console.log(req.query)
    SchoolDetails.findAndCountAll({
        // distinct: true,
        where: where_object,
        attributes:
            ["school_detail_id", "school_name", "school_detail_uuid", "is_school_activate", "country",
                [Sq.col("admin_user.first_name"), "first_name"],
                [Sq.col("admin_user.last_name"), "last_name"],
                [Sq.fn("concat", Sq.col("admin_user.user_login.user_login_detail.first_name"), " ",
                    Sq.col("admin_user.user_login.user_login_detail.last_name")), "last_login_user"],
                [Sq.fn("count", Sq.col("user_count.user_id")), "total_user"]
            ],
        include: [
            {
                model: Users, as: "admin_user",
                where: { role_type: 2 },
                attributes: [],
                duplicating: false,

                include: [{
                    model: UserLoginInfo, as: "user_login",
                    attributes: [],
                    duplicating: false,

                    include: {
                        model: Users, as: "user_login_detail",
                        attributes: [],
                        duplicating: false,
                    }
                }],
            },
            {//table for count user
                model: Users, as: "user_count",
                attributes: [],
                duplicating: false,
            }
        ],

        ...query_object,
        group: [
            "school_details.school_detail_id",
            //  "school_details.school_name",
            "admin_user.first_name", "admin_user.last_name",
            "school_details.school_detail_uuid",
            "admin_user.user_login.user_login_detail.first_name",
            "admin_user.user_login.user_login_detail.last_name",
            // "user_count.user_id"
        ],

    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: { count: response.count.length, rows: response.rows },
            message: "Get All Admin Dashoboard Schools Details Successfully!"
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
