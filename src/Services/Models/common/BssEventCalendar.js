module.exports = async (sequelize2) => {
    const Sq = require("sequelize");

    const BssEventCalendar = sequelize2.define("bss_event_calendar", {

        event_calendar_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        event_calendar_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },
        event_calendar_info: { type: Sq.TEXT, allowNull: false },

        event_start: { type: Sq.DATE, allowNull: false },
        event_end: { type: Sq.DATE, allowNull: false },

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
    return BssEventCalendar;
}