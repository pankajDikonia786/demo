const BssUsers = require("./BssUsers");

module.exports = async (sequelize2) => {
    const Sq = require("sequelize");

    const BssAttendanceDiscarded = sequelize2.define("bss_attendance_discarded", {

        attendance_discarded_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        attendance_discarded_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },
        attendance_title: Sq.STRING,
        session_start_at: { type: Sq.DATE, allowNull: false },
        alloted_time_limit: { type: Sq.STRING(5), allowNull: false },

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

    BssAttendanceDiscarded.hasOne(await BssUsers(sequelize2, Sq), {
        foreignKey: "user_id",
        sourceKey: "created_by",

    })

    return BssAttendanceDiscarded;
};
