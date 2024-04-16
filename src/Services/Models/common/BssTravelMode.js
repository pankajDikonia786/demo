module.exports = async (sequelize2) => {
    const Sq = require("sequelize");

    const BssTravelMode = sequelize2.define("bss_travel_mode", {

        travel_mode_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        travel_mode_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },

        travel_mode_name: { type: Sq.STRING(255), allowNull: false },
        is_travel_mode_activate: { type: Sq.BOOLEAN, defaultValue: true, allowNull: false },

        created_by: Sq.INTEGER,
        updated_by: Sq.INTEGER,
        deleted_by: Sq.INTEGER,

        created_date: { type: Sq.DATE, allowNull: true },
        updated_date: { type: Sq.DATE, allowNull: true },
        deleted_date: { type: Sq.DATE, allowNull: true },
    },
        {
            paranoid: true,
            timestamps: true,
            freezeTableName: true,
            schema: "common",
            createdAt: "created_date",
            updatedAt: "updated_date",
            deletedAt: "deleted_date",

        }
    )   
    BssTravelMode.beforeDestroy(async (bssTravelMode, option) => {
        BssTravelMode.update({
            deleted_by: option.login_user.user_id
        }, { paranoid: false, where: { travel_mode_uuid:bssTravelMode.travel_mode_uuid } })

    })

    return BssTravelMode;
}