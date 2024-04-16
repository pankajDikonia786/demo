module.exports = async (sequelize2) => {
    const BssStudents = require('./BssStudents')
    const Sq = require("sequelize");

    const BssStudentWallet = sequelize2.define("bss_student_wallet", {
        student_wallet_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false
        },

        student_wallet_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },
        student_id: {
            type: Sq.INTEGER,
            allowNull: false
        },
        file_name: { type: Sq.STRING },
        file_type: { type: Sq.STRING },
        files: { type: Sq.TEXT },

        created_by: Sq.INTEGER,
        updated_by: Sq.INTEGER,
        deleted_by: Sq.INTEGER,
        created_date: { type: Sq.DATE, allowNull: true },
        updated_date: { type: Sq.DATE, allowNull: true },
        deleted_date: { type: Sq.DATE, allowNull: true }

    },
        {
            paranoid: false,
            timestamps: true,
            freezeTableName: true,
            schema: "common",
            createdAt: "created_date",
            updatedAt: "updated_date",
            deletedAt: "deleted_date",
        })

    return BssStudentWallet

};