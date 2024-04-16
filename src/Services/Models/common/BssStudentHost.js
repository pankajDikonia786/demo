const Sq = require("sequelize");
module.exports = async (sequelize2) => {


    const BssStudentHost = sequelize2.define("bss_student_host", {

        student_host_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        student_host_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },
        student_id: { type: Sq.INTEGER, },
        host_id: { type: Sq.INTEGER, },

        parent_id: { type: Sq.INTEGER },
        parent_type: { type: Sq.ENUM("father", "mother"),allowNull: true,},

        host_relation: { type: Sq.TEXT, allowNull: false },
        host_status: { type: Sq.BOOLEAN, defaultValue: true, allowNull: false },
        is_host_approved: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        student_host_comment: { type: Sq.TEXT },


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

    return BssStudentHost;
};