module.exports = async (sequelize2) => {
    const Sq = require("sequelize");

    const BssUserMessages = sequelize2.define("bss_user_messages", {

        user_message_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        user_message_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },
        user_id: Sq.INTEGER,
        user_message_title: { type: Sq.STRING(255), allowNull: false },
        user_message_desc: { type: Sq.TEXT },
        is_user_message_active: { type: Sq.BOOLEAN, defaultValue: true },

        created_by: Sq.INTEGER,
        updated_by: Sq.INTEGER,
        deleted_by: Sq.INTEGER,

        created_date: { type: Sq.DATE, allowNull: true },
        updated_date: { type: Sq.DATE, allowNull: true },
        deleted_date: { type: Sq.DATE, allowNull: true },
    },
        {
            paranoid: false,
            timestamps: true,
            freezeTableName: true,
            schema: "common",
            createdAt: "created_date",
            updatedAt: "updated_date",
            deletedAt: "deleted_date",

        }
    )

    // await BssClasses.sync()
    return BssUserMessages;
}