const { DateTime, } = require("luxon");
module.exports = async (sequelize2,query_data) => {
   
    const Sq = require("sequelize");
    const BssStudents = require("./BssStudents");
    const BssUsers = require("./BssUsers");

    const BssDiaryComments = sequelize2.define("bss_diary_comments", {

        diary_comment_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        diary_comment_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },
        student_id: Sq.INTEGER,
        diary_comment_desc: Sq.TEXT,
        diary_comment_type: {
            type: Sq.ENUM, values: ['medical', 'pastoral',],
            allowNull: false
        },
        is_med_issued: { type: Sq.BOOLEAN, defaultValue: false },
        created_by: Sq.INTEGER,
        updated_by: Sq.INTEGER,
        deleted_by: Sq.INTEGER,

        created_date_formated: {
            type: Sq.VIRTUAL,
            get() {
                return  DateTime.fromISO(this.created_date.toISOString()).setZone(query_data.timezone).toFormat('dd/MM/yyyy h:mm a')
             
            },
        },
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

    BssDiaryComments.belongsTo(await BssStudents(sequelize2), {
        as: "comment_student_data", foreignKey: "student_id", sourceKey: "student_id",
        constraints: false, defaultValue: null

    })
    BssDiaryComments.belongsTo(await BssUsers(sequelize2), {
        as: "comment_by_user", sourceKey: "user_id",foreignKey: "created_by", 
        constraints: false, defaultValue: null

    })

    // await BssClasses.sync()
    return BssDiaryComments;
}