module.exports =async(sequelize2)=>{
    const Sq =require('sequelize')
    
    const BssSystemLogs =  sequelize2.define("Bss_system_logs",{
        system_log_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        system_log_uuid:{
            type:Sq.UUID,
            primaryKey:true,
            allowNull:false,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },
        
        user_id: Sq.INTEGER,
        action: Sq.STRING(50),
        html_info: Sq.TEXT,

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
//  await BssSystemLogs.sync({force:true})
    return BssSystemLogs;
}
