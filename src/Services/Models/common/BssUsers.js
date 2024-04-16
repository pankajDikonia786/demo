module.exports = async (sequelize2) => {
    const Sq = require("sequelize");
    const BssStudentAttendance = require("./BssStudentAttendance");
    const BssSubscription =require("./BssSubscription")

    const BssUsers = sequelize2.define(
        "bss_users",
        {
            user_id: {
                type: Sq.INTEGER,
                primaryKey: true,
                allowNull: false,
            },
            user_uuid: {
                type: Sq.UUID,
                primaryKey: true,
                allowNull: false,
            },

            school_detail_id: Sq.INTEGER,
            role_type: Sq.INTEGER,
            role_id:Sq.INTEGER,
            avatar: Sq.TEXT,
            first_name: Sq.STRING,
            last_name: Sq.STRING,
            email: Sq.STRING,
            password: Sq.STRING,
            contact_one: Sq.STRING,
            contact_two: Sq.STRING,
            country_host: Sq.STRING,
            school_code: Sq.STRING,
            is_user_activate: { type: Sq.BOOLEAN, defaultValue: true },
            designation: Sq.STRING,
            comment: Sq.TEXT,
            last_archived_date: Sq.STRING,
            archived_note: Sq.TEXT,
            user_device_token:Sq.STRING,
            user_device_name:Sq.TEXT,

            created_by: Sq.INTEGER,
            updated_by: Sq.INTEGER,
            deleted_by: Sq.INTEGER,
            //for declare at the time model  sync() 
            // createdAt: { type: DataTypes.DATE, allowNull: true, field: "created_at" },
            // updatedAt: { type: DataTypes.DATE, allowNull: true, field: "updated_at" },
            created_date: { type: Sq.DATE, allowNull: true },
            updated_date: { type: Sq.DATE, allowNull: true },
            deleted_date: { type: Sq.DATE, allowNull: true },
        },
        {
            paranoid: false,
            timestamps: true,
            freezeTableName: true,
            schema: "common",
            createdAt: "created_date",
            updatedAt: "updated_date",
            deletedAt: "deleted_date",
            defaultScope: {
                attributes: { exclude: ["password"] },
            },
            scopes: {
                withPassword: { attributes: {} },
            },
        }
    );

 
    return BssUsers;
}
