module.exports = async (sequelize2) => {
    const Sq = require("sequelize");
    const BssReasons = sequelize2.define("bss_reasons", {

        reason_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        reason_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },

        reason_name: { type: Sq.STRING, allowNull: false },
        created_by: Sq.INTEGER,
        created_date: { type: Sq.DATE, allowNull: true },

    },
        {
            paranoid: false,
            timestamps: false,
            freezeTableName: true,
            schema: "common",
            createdAt: "created_date",

        }
    )
    return BssReasons;
}