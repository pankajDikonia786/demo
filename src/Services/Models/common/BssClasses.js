module.exports = async (sequelize2) => {
    const Sq = require("sequelize");
    const BssStudents = require("./BssStudents");

    const BssClasses = sequelize2.define("bss_classes", {

        class_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        class_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },

        class_name: { type: Sq.STRING(50), allowNull: false },
        class_code: { type: Sq.STRING(50), allowNull: false },
        class_desc: Sq.TEXT,
        class_no: Sq.INTEGER,

        is_class_activate: { type: Sq.BOOLEAN, defaultValue: true },

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
    BssClasses.beforeDestroy(async (bssClasses, option) => {
        BssClasses.update({
            deleted_by: option.login_user.user_id
        }, { paranoid: false, where: { class_uuid: bssClasses.class_uuid } })

    })
    // await BssClasses.sync()
    BssClasses.hasMany(await BssStudents(sequelize2), { as: "class_students", foreignKey: "class_id" })
    return BssClasses;
}