module.exports = async (sequelize2) => {
    const Sq = require("sequelize");

    const BssOperationalComments = sequelize2.define("bss_operational_comments", {

        operational_comment_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        operational_comment_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },
   
  
        operational_desc: Sq.TEXT,

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
    return BssOperationalComments;
}