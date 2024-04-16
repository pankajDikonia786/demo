module.exports = async (sequelize2) => {
    const Sq = require("sequelize");

    const BssStudentNotes  = sequelize2.define("bss_student_notes",
   
    {
        student_note_id:{
            type:Sq.INTEGER,
            autoIncrement:true,
            primaryKey:true,
            allowNull:false
        },

        student_note_uuid:{
            allowNull:false,
            type:Sq.UUID,
            primaryKey:true,
            defaultValue:Sq.literal("uuid_generate_v4()")
        },

        student_id:{type:Sq.INTEGER, allowNull:false},
        note_title:{type:Sq.STRING},
        note_desc:{ type:Sq.TEXT},

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
    BssStudentNotes.sync()
    return BssStudentNotes;
};










