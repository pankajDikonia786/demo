
module.exports = async (sequelize2) => {
    const Sq = require("sequelize");
    const BssStudents = require('./BssStudents')
    const BssTravelMode = require('./BssTravelMode')
    const BssHost = require('./BssHost')
    const BssParents = require('./BssParents')
    const BssLeaveRejectReasons = require('./BssLeaveRejectReasons')
    const BssBoarderLeaveDepartureStudents = sequelize2.define("bss_border_leaves", {
     border_leave_departure_student_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        border_leave_departure_student_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },
        
        student_id: Sq.INTEGER,
        border_leave_id: Sq.INTEGER,
        planned_departure_date: Sq.STRING,
        planned_departure_time: Sq.STRING,
        planned_departure_mode_id: Sq.INTEGER,
        departure_status: { type: Sq.ENUM, values : ["schedule_changed" ,"departed" ,"canceled","pending"] , defaultValue: "pending"},
        last_schedule_changed_date:  Sq.STRING,
        last_departed_date:  Sq.STRING,
        last_canceled_date:  Sq.STRING,
        schedule_changed_reason : Sq.TEXT,
        schedule_changed_by_user: Sq.STRING,
        departed_by_user: Sq.STRING,
        canceled_by_user: Sq.STRING,
        
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
    
    // BssBorderLeaves.belongsTo(await BssStudents(sequelize2), { as: 'leave_stu_data' , foreignKey : 'student_id' , sourceKey :'student_id' })
    // BssBorderLeaves.belongsTo(await BssTravelMode(sequelize2), { as: 'departure_mode_data' , foreignKey : 'departure_mode_id' , sourceKey :'travel_mode_id' })
    // BssBorderLeaves.belongsTo(await BssTravelMode(sequelize2), { as: 'return_mode_data' , foreignKey : 'return_mode_id' , sourceKey :'travel_mode_id' })
    // BssBorderLeaves.belongsTo(await BssHost(sequelize2), { as: 'stu_host_data' , foreignKey : 'host_id' , sourceKey :'host_id' })
    // BssBorderLeaves.belongsTo(await BssParents(sequelize2), { as: 'parent_data' , foreignKey : 'parent_id' , sourceKey :'parent_id' })
    // BssBorderLeaves.belongsTo(await BssLeaveRejectReasons(sequelize2), { as: 'parent_rejected_reason_data' , foreignKey : 'parent_rejected_reason_id' , sourceKey :'leave_reject_reason_id' })
    // BssBorderLeaves.belongsTo(await BssLeaveRejectReasons(sequelize2), { as: 'user_rejected_reason_data' , foreignKey : 'user_rejected_reason_id' , sourceKey :'leave_reject_reason_id' })
    await BssBoarderLeaveDepartureStudents.sync({force:true})
    return BssBoarderLeaveDepartureStudents;
}