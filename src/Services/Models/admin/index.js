const Users = require("./Users");
const SchoolDetails = require("./SchoolDetails");
const UserLoginInfo = require("./UserLoginInfo")
const BssSubscription =require("./BssSubscription")
SchoolDetails.hasMany(Users, {

    foreignKey: "school_detail_id",
    as: "admin_user"
})

SchoolDetails.hasOne(BssSubscription, {
    foreignKey: "school_detail_id",
    as: "subscriptionData"
})

SchoolDetails.hasMany(Users, {

    foreignKey: "school_detail_id",
    as: "user_count"
})
Users.belongsTo(SchoolDetails, {
    as: "user_school",
    foreignKey: "school_detail_id",
    sourceKey: "school_detail_id",

})
Users.hasOne(UserLoginInfo, {
    as: "user_login",
    foreignKey: "school_detail_id",
    sourceKey: "school_detail_id",

})
UserLoginInfo.belongsTo(Users, {
    as: "user_login_detail",
    foreignKey: "user_id",
    sourceKey: "user_id",

})


module.exports = {
    Users,
    SchoolDetails,
    UserLoginInfo,
    BssSubscription
}
