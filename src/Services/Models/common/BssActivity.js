module.exports = async (sequelize2) => {
    const Sq = require("sequelize");

    const BssActivity = sequelize2.define("bss_activity", {

        activity_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        activity_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },

        activity_name: { type: Sq.STRING(255), allowNull: false },
        is_activity_activate: { type: Sq.BOOLEAN, defaultValue: true, allowNull: false },

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
    BssActivity.beforeDestroy(async (bssActivity, option) => {
        BssActivity.update({
            deleted_by: option.login_user.user_id
        }, { paranoid: false, where: { activity_uuid: bssActivity.activity_uuid } })

    })

    return BssActivity;
}