module.exports = async (sequelize2) => {
    const Sq = require("sequelize");
    const BssReasons = require("./BssReasons");
    const BssOnCampusLocations = require("./BssOnCampusLocations");
    const bssStudents = require("./BssStudents");
    const BssUsers = require("./BssUsers");

    const BssStudentAttendance = sequelize2.define("bss_student_attendance", {

        student_attendance_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        student_attendance_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },
        school_detail_id: Sq.INTEGER,
        student_id: { type: Sq.INTEGER, allowNull: false },
        reason_id: Sq.INTEGER,
        leave_id: Sq.INTEGER,
        attendance_user_id: { type: Sq.INTEGER, allowNull: false },
        // on_campus_location_id: Sq.INTEGER,
        is_attendance: { type: Sq.BOOLEAN, defaultValue: true },
        duration_time: { type: Sq.DATE, },
        is_latest: { type: Sq.BOOLEAN, defaultValue: true },

        atten_info: {
            type: Sq.VIRTUAL,
            get() {
                return this.is_attendance === true ? "Present" : "Absent"
            },

        },
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
    )
    BssStudentAttendance.hasMany(await BssReasons(sequelize2), {
        as: "attendance_reason", foreignKey: "reason_id", sourceKey: "reason_id",
        // constraints: false, allowNull: true, defaultValue: null

    })
    // BssStudentAttendance.hasMany(await BssOnCampusLocations(sequelize2), {
    //     as: "attendance_oncampus", foreignKey: "on_campus_location_id", sourceKey: "on_campus_location_id"
    //     , constraints: false, allowNull: true, defaultValue: null
    // })
    BssStudentAttendance.hasOne(await BssReasons(sequelize2), {
        as: "atten_reason_data", foreignKey: "reason_id", sourceKey: "reason_id",
        // constraints: false, allowNull: true, defaultValue: null

    })
    // BssStudentAttendance.hasOne(await BssOnCampusLocations(sequelize2), {
    //     as: "atten_oncampus_data", foreignKey: "on_campus_location_id", sourceKey: "on_campus_location_id"
    //     , constraints: false, allowNull: true, defaultValue: null
    // })


    return BssStudentAttendance;
}