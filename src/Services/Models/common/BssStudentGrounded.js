const BssStudents = require("./BssStudents");
module.exports = async (sequelize2) => {
    const Sq = require("sequelize");

    const BssStudentGrounded = sequelize2.define("bss_student_grounded", {

        student_grounded_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        student_grounded_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },
        student_id: Sq.INTEGER,
        grounded_start_date: Sq.DATEONLY,
        grounded_end_date: Sq.DATEONLY,
        grounded_desc: Sq.TEXT,

        dis_foyer_app: { type: Sq.BOOLEAN, defaultValue: false },
        grounded_mail_parent: { type: Sq.BOOLEAN, defaultValue: false },
        grounded_mail_student: { type: Sq.BOOLEAN, defaultValue: false },

        is_grounded_activate: { type: Sq.BOOLEAN, defaultValue: true },

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
    BssStudentGrounded.belongsTo(await BssStudents(sequelize2, Sq), {
        as: "grounded_student_data", sourceKey: "student_id", foreignKey: "student_id",

    })


    return BssStudentGrounded;
}