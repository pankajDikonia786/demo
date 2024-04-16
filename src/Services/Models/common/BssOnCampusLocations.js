module.exports = async (sequelize2) => {
    const Sq = require("sequelize");

    const BssStudentOnCampusLocations = sequelize2.define("bss_on_campus_locations", {

       on_campus_location_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
      on_campus_location_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },

        location_name: Sq.STRING(255),
        is_on_campus_activate: { type: Sq.BOOLEAN, defaultValue: true },

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
    return BssStudentOnCampusLocations;
}