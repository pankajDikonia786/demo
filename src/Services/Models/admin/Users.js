const Sq = require("sequelize");
const sequelize = require("../../dbconfig");
const Users = sequelize.define(
    "users",
    {
        user_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        user_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },
        school_detail_id: Sq.INTEGER,
        school_code: Sq.STRING,
        avatar: Sq.TEXT,
        contact_one: Sq.STRING,
        contact_two: Sq.STRING,
        first_name: Sq.STRING(255),
        last_name: Sq.STRING(255),
        email: Sq.STRING(255),
        role_type: Sq.INTEGER,
        password: Sq.STRING,
        original_password: Sq.STRING,
        country_host: Sq.STRING,
        is_user_activate: { type: Sq.BOOLEAN, defaultValue: true },
        designation: Sq.STRING,
        comment: Sq.TEXT,
        last_archived_date: Sq.STRING,
        archived_note: Sq.TEXT,

        created_by: Sq.INTEGER,
        updated_by: Sq.INTEGER,
        deleted_by: Sq.INTEGER,
        created_date: { type: Sq.DATE, allowNull: true },
        updated_date: { type: Sq.DATE, allowNull: true },
        deleted_date: { type: Sq.DATE, allowNull: true },
    },
    {
        indexes: [
            {
                unique: false,
                fields: ['school_detail_id']
            }
        ],
        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: "admin",
        createdAt: "created_date",
        updatedAt: "updated_date",
        deletedAt: "deleted_date",


        defaultScope: {
            attributes: { exclude: ["password", "original_password"] },
        },
        scopes: {
            withPassword: { attributes: {} },
        },
    }
);

module.exports = Users;

