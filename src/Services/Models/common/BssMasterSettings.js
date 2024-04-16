module.exports = async (sequelize2) => {
    const Sq = require("sequelize");

    const BssMasterSettings = sequelize2.define("bss_master_settings", {

        master_setting_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        master_setting_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },
        meta_key: { type: Sq.STRING },
        meta_value_one: { type: Sq.STRING },
        meta_value_two: { type: Sq.STRING },
        meta_value_three: { type: Sq.STRING },

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
    return BssMasterSettings;
}