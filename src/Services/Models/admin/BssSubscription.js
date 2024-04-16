
const Sq = require("sequelize");

const sequelize = require("../../dbconfig");

const BssSubscription = sequelize.define(
    "bss_subscription",
    {
        bss_subscription_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        bss_subscription_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },
        school_detail_id:{type:Sq.INTEGER},
        start_date: Sq.STRING,
        end_date: Sq.STRING,
        type: {
            type: Sq.ENUM, values: ['demo', 'subscription',],
            allowNull: false
        },


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
// BssSubscription.sync({force:true})
module.exports = BssSubscription;

