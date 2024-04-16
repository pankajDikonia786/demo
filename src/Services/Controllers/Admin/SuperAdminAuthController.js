const bcrypt=require("bcrypt");
const {Users}=require("../../Models/admin");
module.exports.RegisterSuperAdmin = async (req, res) => {

    const admin_detail = req.body;
    if (await Users.findOne({ where: { email: admin_detail.email } })) {
      return res.send({
        status: 400,
        success: false,
        message: 'Username already exists. Please try a different username'
      })
    }
    if (admin_detail.password) {
      admin_detail.password = await bcrypt.hash(admin_detail.password, 10);
    }
  
    admin_detail.role_type =1
    await Users.create(admin_detail).then(async (response) => {
      res.json({
        status: 200,
        success: true,
        message: "Super Admin Created successfully"
  
      })
    })
  
  }