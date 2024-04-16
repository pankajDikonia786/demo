const Sq = require("sequelize");

const sequelize = require("../../dbconfig");

const UserLoginInfo = sequelize.define(
    "user_login_info",
    {
        user_login_info_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        user_login_info_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },
        user_id: Sq.INTEGER,
        school_detail_id: Sq.INTEGER,
        role_type: Sq.INTEGER,
        // user_last_login: Sq.DATE,

        created_by: Sq.INTEGER,
        updated_by: Sq.INTEGER,
        deleted_by: Sq.INTEGER,


    },
    {
        freezeTableName: true,
        schema: "admin",
        createdAt: "created_date",
        updatedAt: "updated_date",
        paranoid: false,
        timestamps: true,
        deletedAt: "deleted_date",

    }
);

module.exports = UserLoginInfo;
