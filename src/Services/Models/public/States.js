const sequelize = require('../../dbconfig')
const Sq = require("sequelize");
const States = sequelize.define(
    "states",
    {
        state_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        state_name:Sq.STRING,
     
        country_id:Sq.INTEGER,
        is_activate: { type: Sq.BOOLEAN, defaultValue: true },
     
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



module.exports = States;
