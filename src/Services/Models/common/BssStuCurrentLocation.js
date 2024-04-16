const BssReasons = require("./BssReasons");
const BssOnCampusLocations = require("./BssOnCampusLocations");

module.exports = async (sequelize2) => {
    const Sq = require("sequelize");

    const BssStuCurrrentLocation = sequelize2.define("bss_stu_current_location", {

        stu_current_location_id: {
            //primary key not applied 
            type: Sq.INTEGER,
            autoIncrement: true,
            allowNull: false,
        },
        stu_current_location_uuid: {
            //primary key not applied 
            allowNull: false,
            type: Sq.UUID,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },
        student_id: { type: Sq.INTEGER, primaryKey: true, },
        reason_id: { type: Sq.INTEGER, unique: false },
        on_campus_location_id: { type: Sq.INTEGER, unique: false },
        current_present_status: { type: Sq.BOOLEAN, defaultValue: true, },
        is_loc_changed: { type: Sq.BOOLEAN, allowNull: false, defaultValue: true, },

        created_by: Sq.INTEGER,
        updated_by: Sq.INTEGER,
        deleted_by: Sq.INTEGER,

        created_date: { type: Sq.DATE, allowNull: true },
        updated_date: { type: Sq.DATE, allowNull: true },
        deleted_date: { type: Sq.DATE, allowNull: true },
    },
        {
            // indexes: [
            //     {
            //         unique: true,
            //         fields: ['stu_current_location_id', 'stu_current_location_uuid']
            //     }
            // ],
            paranoid: false,
            timestamps: true,
            freezeTableName: true,
            schema: "common",
            createdAt: "created_date",
            updatedAt: "updated_date",
            deletedAt: "deleted_date",

        }
    )
    BssStuCurrrentLocation.hasOne(await BssReasons(sequelize2),
        {
            as: "current_loc_reason", foreignKey: "reason_id", sourceKey: "reason_id",
            constraints: false, allowNull: true, defaultValue: null
        });

    BssStuCurrrentLocation.hasOne(await BssOnCampusLocations(sequelize2),
        {
            as: "current_loc_oncampus", foreignKey: "on_campus_location_id", sourceKey: "on_campus_location_id",
            constraints: false, allowNull: true, defaultValue: null
        })

    return BssStuCurrrentLocation;
}