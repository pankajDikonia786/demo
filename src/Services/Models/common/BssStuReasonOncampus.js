module.exports = async (sequelize2) => {
    const Sq = require("sequelize");
    const BssReasons = require("./BssReasons");
    const BssOnCampusLocations = require("./BssOnCampusLocations");

    const BssStuReasonOncampus = sequelize2.define("bss_stu_reason_oncampus", {

        stu_reason_oncampus_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        stu_reason_oncampus_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },

        student_id: { type: Sq.INTEGER, allowNull: false },
        on_campus_location_id: { type: Sq.INTEGER, },
        reason_id: { type: Sq.INTEGER, },
        sign_in_out_status: { type: Sq.INTEGER, allowNull: false, comment: "1=in,2=out" },
        sign_in_date: { type: Sq.DATE, },
        sign_out_date: { type: Sq.DATE, },

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
    BssStuReasonOncampus.hasOne(await BssOnCampusLocations(sequelize2), {
        foreignKey: "on_campus_location_id", sourceKey: "on_campus_location_id"

    });
   
    BssStuReasonOncampus.hasOne(await BssReasons(sequelize2), {
        foreignKey: "reason_id", sourceKey: "reason_id", as: "reason_data"

    });
    BssStuReasonOncampus.hasMany(await BssOnCampusLocations(sequelize2), {
       as:"oncampus_loc_datas", foreignKey: "on_campus_location_id", sourceKey: "on_campus_location_id"


    });
   
    BssStuReasonOncampus.hasMany(await BssReasons(sequelize2), {
        foreignKey: "reason_id", sourceKey: "reason_id", as: "reasons_data"

    });

    return BssStuReasonOncampus;
}