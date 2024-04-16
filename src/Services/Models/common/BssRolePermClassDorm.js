module.exports = async (sequelize2) => {
    const Sq = require("sequelize");
    const BssDormitories = require("./BssDormitories");
    const BssClasses = require("./BssClasses");

    const BssRolePermClassDorm = sequelize2.define("bss_role_perm_class_dorm", {

        role_perm_class_dorm_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        role_perm_class_dorm_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },
        role_id: { type: Sq.INTEGER, allowNull: false },
        role_permission_id: { type: Sq.INTEGER },
        class_id: { type: Sq.INTEGER },
        dormitory_id: { type: Sq.INTEGER },
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
    );

    BssRolePermClassDorm.hasOne(await BssDormitories(sequelize2),
        {
            as: "roll_perm_dorm", foreignKey: "dormitory_id", sourceKey: "dormitory_id",
            constraints: false, allowNull: true, defaultValue: null
        });
    BssRolePermClassDorm.hasOne(await BssClasses(sequelize2),
        {
            as: "roll_perm_class", foreignKey: "class_id", sourceKey: "class_id",
            constraints: false, allowNull: true, defaultValue: null
        });
    return BssRolePermClassDorm;
}