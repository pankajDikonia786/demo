
module.exports =async(Sequelize2)=>{
    const Sq =require('sequelize')

    const BssSubscription =Sequelize2.define("bss_subscription",{
        bss_subscription_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        bss_subscription_uuid:{
            type:Sq.UUID,
            primaryKey:true,
            allowNull:false,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },
          
        school_detail_id:{type:Sq.INTEGER},
        start_date: Sq.STRING,
        end_date: Sq.STRING,
        type: {
            type: Sq.ENUM, values: ['demo', 'subscription',],
            allowNull: false
        },

        created_by: Sq.INTEGER,
        updated_by: Sq.INTEGER,
        deleted_by: Sq.INTEGER,
   
        created_date: { type: Sq.DATE, allowNull: true },
        updated_date: { type: Sq.DATE, allowNull: true },
        deleted_date: { type: Sq.DATE, allowNull: true },


    },{
        paranoid: true,
        timestamps: true,
        freezeTableName: true,
        schema: "common",
        createdAt: "created_date",
        updatedAt: "updated_date",
        deletedAt: "deleted_date",

    })

    // await BssSubscription.sync({force:true})
    return await BssSubscription
    
}