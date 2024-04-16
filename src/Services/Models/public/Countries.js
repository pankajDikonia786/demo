const sequelize = require('../../dbconfig')
const Sq = require("sequelize");
const Countries = sequelize.define(
    "countries",
    {
        country_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        country_code:Sq.STRING,
        name:Sq.STRING(255),
        phone_code:Sq.INTEGER,
        is_selected:{type:Sq.BOOLEAN,defaultValue:false},
        country_host:Sq.STRING, 
   
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
        paranoid: true,
      
    }
);


module.exports = Countries;
