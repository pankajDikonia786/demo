
module.exports = async (sequelize2) => {
    const Sq = require("sequelize");
    const BssStudents = require('./BssStudents')
    const BssTravelMode = require('./BssTravelMode')
    const BssHost = require('./BssHost')
    const BssParents = require('./BssParents')
    const BssLeaveRejectReasons = require('./BssLeaveRejectReasons')
    const BssBorderLeaves = sequelize2.define("bss_border_leaves", {

        border_leave_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        border_leave_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },

        student_id: Sq.INTEGER,
        class_id: Sq.INTEGER,
        dormitory_id: Sq.INTEGER,
        host_id: Sq.INTEGER,
        parent_id: Sq.INTEGER,
        remarks_by_host: Sq.TEXT,
        departure_date: Sq.STRING,
        departure_time: Sq.STRING,
        departure_mode_id: Sq.INTEGER,
        return_date: Sq.STRING,
        return_time: Sq.STRING,
        return_mode_id: Sq.INTEGER,
        remarks_by_parent: Sq.TEXT,
        remarks_by_boarding: Sq.TEXT,
        additional_notes: Sq.TEXT,
        leave_applied_ontime: { type: Sq.BOOLEAN,  defaultValue: false },
        is_parent_approval: { type: Sq.ENUM, values : ["approved" ,"pending" ,"rejected"] , defaultValue: "pending"},
        is_user_approval: { type: Sq.ENUM, values : ["approved" ,"pending" ,"rejected"] , defaultValue: "pending"},
        last_parent_approval_date:  Sq.STRING,
        last_user_approval_date:  Sq.STRING,
        parent_approved_comments : Sq.TEXT,
        user_approved_comments : Sq.TEXT,
        parent_rejected_reason_id : Sq.INTEGER,
        user_rejected_reason_id : Sq.INTEGER,
        approval_by_parent: Sq.STRING,
        approval_by_user: Sq.STRING,
        is_leave_archived: { type: Sq.BOOLEAN, defaultValue: false},
        last_archived_date:  Sq.STRING,
        archived_by: Sq.STRING,
        created_by: Sq.INTEGER,
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
    
    BssBorderLeaves.belongsTo(await BssStudents(sequelize2), { as: 'leave_stu_data' , foreignKey : 'student_id' , sourceKey :'student_id' })
    BssBorderLeaves.belongsTo(await BssTravelMode(sequelize2), { as: 'departure_mode_data' , foreignKey : 'departure_mode_id' , sourceKey :'travel_mode_id' })
    BssBorderLeaves.belongsTo(await BssTravelMode(sequelize2), { as: 'return_mode_data' , foreignKey : 'return_mode_id' , sourceKey :'travel_mode_id' })
    BssBorderLeaves.belongsTo(await BssHost(sequelize2), { as: 'stu_host_data' , foreignKey : 'host_id' , sourceKey :'host_id' })
    BssBorderLeaves.belongsTo(await BssParents(sequelize2), { as: 'parent_data' , foreignKey : 'parent_id' , sourceKey :'parent_id' })
    BssBorderLeaves.belongsTo(await BssLeaveRejectReasons(sequelize2), { as: 'parent_rejected_reason_data' , foreignKey : 'parent_rejected_reason_id' , sourceKey :'leave_reject_reason_id' })
    BssBorderLeaves.belongsTo(await BssLeaveRejectReasons(sequelize2), { as: 'user_rejected_reason_data' , foreignKey : 'user_rejected_reason_id' , sourceKey :'leave_reject_reason_id' })
    // await BssBorderLeaves.sync({force:true})
    return BssBorderLeaves;
}