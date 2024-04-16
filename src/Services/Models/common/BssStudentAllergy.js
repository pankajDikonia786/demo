
module.exports = async (sequelize2) => {
    const Sq = require("sequelize");

    const BssStudentAllergy = sequelize2.define("bss_student_allergy", {

        student_allergy_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
            unique:true
        },
        student_allergy_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },
        student_id: { type: Sq.INTEGER, allowNull: false },
        allergy_name: { type: Sq.STRING.BINARY, allowNull: false },
        allergy_info: { type: Sq.STRING.BINARY },
        allergy_note: { type: Sq.STRING.BINARY },

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

    BssStudentAllergy.beforeFind(async (bssStudentAllergy, options) => {
        if (bssStudentAllergy?.attributes) {
            bssStudentAllergy.attributes.include = [
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('allergy_name'), PG_ENCRYPT_KEY), "allergy_name"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('allergy_info'), PG_ENCRYPT_KEY), "allergy_info"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('allergy_note'), PG_ENCRYPT_KEY), "allergy_note"],

            ]
        }
    })
    return BssStudentAllergy;
}