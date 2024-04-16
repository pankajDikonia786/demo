const BssStudents = require("./BssStudents");
module.exports = async (sequelize2) => {
    const Sq = require("sequelize");

    const BssStudentGeneric = sequelize2.define("bss_student_generic", {

        student_generic_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        student_generic_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },
        student_id: { type: Sq.INTEGER, allowNull: false },
        generic_start_date: { type: Sq.DATEONLY, allowNull: false },
        generic_end_date: { type: Sq.DATEONLY, allowNull: false },
        generic_desc: { type: Sq.TEXT, allowNull: false },
        is_generic_activate: { type: Sq.BOOLEAN, defaultValue: true },

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
    

    // await BssClasses.sync()
    return BssStudentGeneric;
}