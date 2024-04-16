const BssSubscription = require("./BssSubscription");

module.exports = async (sequelize2) => {
    const Sq = require("sequelize");
    const BssUsers = require("./BssUsers");

    const BssSchoolDetails = sequelize2.define(
        "bss_school_details",
        {
            school_detail_id: {
                type: Sq.INTEGER,
                primaryKey: true,
                allowNull: false,
            },
            school_detail_uuid: {
                allowNull: false,
                type: Sq.UUID,
                primaryKey: true,
            },

            school_name: Sq.TEXT,
            school_logo: Sq.TEXT,
            school_code: { type: Sq.STRING, allowNull: false },
            school_code: { type: Sq.STRING, allowNull: false },
            actual_school_code: Sq.STRING,
            highest_class: Sq.INTEGER,
            country_host: Sq.STRING,
            school_address: Sq.TEXT,
            zipcode: Sq.STRING,
            timezone: Sq.STRING,
            country: Sq.STRING,
            country_id: Sq.INTEGER,
            country_code: Sq.STRING,
            state: Sq.STRING,
            state_id: Sq.INTEGER,
            city: Sq.STRING,
            city_id: Sq.INTEGER,
            session_start_year: Sq.STRING,
            session_end_year: Sq.STRING,
            session_start_month: Sq.STRING,
            session_end_month: Sq.STRING,
            weekend_day_from: Sq.STRING,
            weekend_day_to: Sq.STRING,
            weekend_time_from: Sq.STRING,
            weekend_time_to: Sq.STRING,
            cut_off_day: Sq.STRING,
            cut_off_time: Sq.STRING,

            is_school_activate: { type: Sq.BOOLEAN, defaultValue: true },

            created_by: Sq.INTEGER,
            updated_by: Sq.INTEGER,
            deleted_by: Sq.INTEGER,

            created_date: { type: Sq.DATE, allowNull: true },
            updated_date: { type: Sq.DATE, allowNull: true },
            deleted_date: { type: Sq.DATE, allowNull: true },
        },
        {
            freezeTableName: true,
            schema: "common",
            createdAt: "created_date",
            updatedAt: "updated_date",
            paranoid: true,
            timestamps: true,
            deletedAt: "deleted_date",
        }
    );
    BssSchoolDetails.hasOne(await BssUsers(sequelize2, Sq), {
        as: "school_manager_data", foreignKey: "school_detail_id", sourceKey: "school_detail_id"

    })
    BssSchoolDetails.hasOne(await BssSubscription(sequelize2, Sq), {
        as: "subscription_data", foreignKey: "school_detail_id", sourceKey: "school_detail_id"

    })
    
    
    return BssSchoolDetails;
};