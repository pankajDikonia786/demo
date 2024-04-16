const sequelize = require('../../dbconfig')
const Sq = require("sequelize");
const States = sequelize.define(
    "timezones",
    {
        timezone_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        country_code: Sq.STRING,

        coordinates: Sq.STRING,
        timezone: Sq.STRING,
        comments: Sq.STRING,
        utc_offset: Sq.STRING,
        utc_dst_offset: Sq.STRING,
        notes: Sq.STRING
    },
    {
        timestamps: true,
        freezeTableName: true,
        schema: "public",
        createdAt: "created_date",
        updatedAt: "updated_date",
        deletedAt: "deleted_date",
        paranoid: true,

    }
);


module.exports = States;
