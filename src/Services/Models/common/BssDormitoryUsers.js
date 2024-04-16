module.exports = async (sequelize2) => {
    const Sq = require("sequelize");

    const BssDormitoryUsers = sequelize2.define("bss_dormitory_users", {

        dormitory_user_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        dormitory_user_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },
        user_id: { type: Sq.INTEGER, },
        dormitory_id: { type: Sq.INTEGER, allowNull: false },

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
    return BssDormitoryUsers;
}