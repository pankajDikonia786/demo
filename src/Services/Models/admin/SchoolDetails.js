const Sq = require("sequelize");

const sequelize = require("../../dbconfig");

const SchoolDetails = sequelize.define(
    "school_details",
    {
        school_detail_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        school_detail_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },

        school_name: Sq.TEXT,
        school_code: { type: Sq.STRING, allowNull: false },
        actual_school_code: Sq.STRING(255),
        school_logo: Sq.TEXT,
        highest_class: { type: Sq.INTEGER, allowNull: false },
        country_host: Sq.STRING,
        school_address: { type: Sq.TEXT, allowNull: false },
        zipcode: Sq.STRING,
        timezone: { type: Sq.STRING, allowNull: false },
        country_code: Sq.STRING,
        country: { type: Sq.STRING, allowNull: false },
        country_id: Sq.INTEGER,
        state: Sq.STRING,
        state_id: Sq.INTEGER,
        city: Sq.STRING,
        city_id: Sq.INTEGER,

        session_start_year: { type: Sq.STRING, allowNull: false },
        session_end_year: { type: Sq.STRING, allowNull: false },
        session_start_month: { type: Sq.STRING, allowNull: false },
        session_end_month: { type: Sq.STRING, allowNull: false },

        weekend_day_from: { type: Sq.STRING, allowNull: false },
        weekend_day_to: { type: Sq.STRING, allowNull: false },
        weekend_time_from: { type: Sq.STRING, allowNull: false },
        weekend_time_to: { type: Sq.STRING, allowNull: false },

        cut_off_day: { type: Sq.STRING, allowNull: false },
        cut_off_time: { type: Sq.STRING, allowNull: false },

        is_school_activate: { type: Sq.BOOLEAN, defaultValue: true },

        created_by: Sq.INTEGER,
        updated_by: Sq.INTEGER,
        deleted_by: Sq.INTEGER,


    },
    {
        freezeTableName: true,
        schema: "admin",
        createdAt: "created_date",
        updatedAt: "updated_date",
        paranoid: false,
        timestamps: true,
        deletedAt: "deleted_date",

    }
);

module.exports = SchoolDetails;
