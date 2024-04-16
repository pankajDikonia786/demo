const Sq = require("sequelize");
module.exports = async (sequelize2) => {
    const BssRolePermission = require("./BssRolePermissions");


    const BssRole = sequelize2.define("bss_role", {

        role_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        role_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },
        role_name: { type: Sq.STRING },
        is_role_activate:{type:Sq.BOOLEAN,allowNull:false,defaultValue:true},
        drag_id: {type: Sq.INTEGER},

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

    //  await BssRole.sync({force:true})

    BssRole.hasOne(await BssRolePermission(sequelize2),
        {
            as: "roll_perm", foreignKey: "role_id",
            constraints: false, allowNull: true, defaultValue: null
        });
    return BssRole;

};
