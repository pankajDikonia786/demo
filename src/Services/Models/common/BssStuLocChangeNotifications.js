const { INTEGER } = require("sequelize");

module.exports = async (sequelize2) => {
    const Sq = require("sequelize");
    const BssStudents = require("./BssStudents");
    const BssAttendanceUsers = require("./BssAttendanceUsers");
    const BssUsers = require("./BssUsers");

    const BssStuLocChangeNotifications = sequelize2.define(
        "bss_stu_loc_change_notificatons", {

        stu_loc_change_notification_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        stu_loc_change_notification_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },

        student_id: { type: Sq.INTEGER, allowNull: false },
        user_id: { type: INTEGER, allowNull: false },
        attendance_user_id: { type: Sq.INTEGER, },
        stu_current_loc_name: { type: Sq.STRING, allowNull: false },
          is_notification_read: { type: Sq.BOOLEAN, allowNull: false, defaultValue: false },


        created_by: Sq.INTEGER,
        updated_by: Sq.INTEGER,
        deleted_by: Sq.INTEGER,

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

        }
    );
    BssStuLocChangeNotifications.hasOne(await BssStudents(sequelize2), {
        foreignKey: "student_id", sourceKey: "student_id",
        constraints: false, allowNull: true, defaultValue: null
    });
    BssStuLocChangeNotifications.hasOne(await BssAttendanceUsers(sequelize2), {
        as: "atten_user_data", foreignKey: "attendance_user_id",
        sourceKey: "attendance_user_id", constraints: false, allowNull: true, defaultValue: null
    });
    BssStuLocChangeNotifications.hasOne(await BssUsers(sequelize2), {
        foreignKey: "user_id",
        sourceKey: "created_by", constraints: false, allowNull: true, defaultValue: null
    });

    return BssStuLocChangeNotifications;
};