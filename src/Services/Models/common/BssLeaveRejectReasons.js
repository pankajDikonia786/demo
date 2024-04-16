module.exports = async (sequelize2) => {
    const Sq = require("sequelize");

    const BssLeaveRejectReasons = sequelize2.define("bss_leave_reject_reasons", {

        leave_reject_reason_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        leave_reject_reason_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },

        reject_reason: { type: Sq.STRING(255), allowNull: false },
        is_reject_reason_activate: { type: Sq.BOOLEAN, defaultValue: true, allowNull: false },

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
    BssLeaveRejectReasons.beforeDestroy(async (bssLeaveRejectReasons, option) => {
        BssLeaveRejectReasons.update({
            deleted_by: option.login_user.user_id
        }, {
            paranoid: false, where: {
                leave_reject_reason_uuid:
                    bssLeaveRejectReasons.leave_reject_reason_uuid
            }
        })

    })

    return BssLeaveRejectReasons;
}