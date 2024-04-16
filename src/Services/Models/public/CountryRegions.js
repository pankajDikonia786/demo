const sequelize = require('../../dbconfig')
const Sq = require("sequelize");
const CountryRegions = sequelize.define(
    "country_regions",
    {
        country_region_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        region_name: { type: Sq.STRING(255), allowNull: false },
        country_host: { type: Sq.STRING(255), allowNull: false },
        ec2_instance_name: { type: Sq.STRING(255), allowNull: false },

        created_by: Sq.STRING,
        updated_by: Sq.STRING,
        deleted_by: Sq.STRING,
    },
    {
        timestamps: true,
        freezeTableName: true,
        schema: "public",
        createdAt: "created_date",
        updatedAt: "updated_date",
        deletedAt: "deleted_date",
        paranoid: false,
    }
);


module.exports = CountryRegions;
