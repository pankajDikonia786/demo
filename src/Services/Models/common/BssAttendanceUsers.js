module.exports = async (sequelize2) => {
    const Sq = require("sequelize");
    const BssStudentAttendance = require("./BssStudentAttendance");
    const BssUsers = require("./BssUsers");

    const BssAttendanceUsers = sequelize2.define("bss_attendance_users", {

        attendance_user_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        attendance_user_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },

        user_id: { type: Sq.INTEGER, allowNull: false },
        duration_time: { type: Sq.DATE, allowNull: false },
             attendance_title: Sq.STRING,

        created_by: Sq.INTEGER,
        updated_by: Sq.INTEGER,
        deleted_by: Sq.INTEGER,

        created_date: { type: Sq.DATE, allowNull: true },
        updated_date: { type: Sq.DATE, allowNull: true },
        deleted_date: { type: Sq.DATE, allowNull: true },
    },
        {
            paranoid: true,
            timestamps: true,
            freezeTableName: true,
            schema: "common",
            createdAt: "created_date",
            updatedAt: "updated_date",
            deletedAt: "deleted_date",

        }
    )

    BssAttendanceUsers.hasMany(await BssStudentAttendance(sequelize2), {
        as: "atten_data", foreignKey: "attendance_user_id",

    })
    BssAttendanceUsers.hasOne(await BssUsers(sequelize2), {
        as: "attend_user", foreignKey: "user_id", sourceKey: "user_id",
        constraints: false, allowNull: true, defaultValue: null


    })

    return BssAttendanceUsers;
}