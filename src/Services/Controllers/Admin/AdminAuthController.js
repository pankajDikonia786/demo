const Sq = require("sequelize");
const fs = require("fs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { DateTime } = require("luxon");
const { SendEmail } = require("../../../libs/Helper");
const { configNewDb } = require("../../../libs/NewDb");
const { Users, SchoolDetails, UserLoginInfo } = require("../../Models/admin");
const { BssUsers, BssSchoolDetails } = require("../../Models/common");

module.exports.SignIn = async (req, res) => {
    let user_detail = req.body;

    const user = await Users.scope("withPassword").findOne({
        where: { email: user_detail.email },
        attributes: { exclude: ['original_password'], }
        , include: {
            model: SchoolDetails, as: "user_school",
            attributes:{exclude:["created_by","updated_by","deleted_by","created_date","updated_date","deleted_date"]}
        }
    });

    if (!user || !await (bcrypt.compare(user_detail.password, user.password))) {
        return res.json({
            status: 400,
            success: false,
            message: "Username or Password is incorrect",
        });
    }

    if (user.user_school?.is_school_activate == false || user.user_school?.is_school_activate == "false"
        || user.is_user_activate == false || user.is_user_activate == "false") {
        return res.json({
            status: 400,
            success: false,
            message: "Your account has been deactivated,please reach out to support for activate the account",
        });
    }
    await Users.update({ device_token, device_name },
        { where: {user_id: user.user_id}});
    let token = jwt.sign({ user_uuid: user.user_uuid }, "Bss_Super_Secret");

    // if (user.role_type > 1) {
    //     await UserLoginInfo.destroy({ where: { school_detail_id: user.school_detail_id } })

    //     UserLoginInfo.create({
    //         user_id: user.user_id, school_detail_id: user.school_detail_id
    //     },)
    // }
    console.log(user.school_detail_id)

    return res.json({
        status: 200,
        success: true,
        token: token,
        data: user,
        message: "Logged in Successfully!",
    });
};

module.exports.ForgotPassword = async (req, res) => {
    const { email } = req.body;

    const userResponse = await Users.findOne({ where: { email } });
    console.log(userResponse)

    if (!userResponse || userResponse === null) {
        return res.json({
            status: 400,
            success: false,
            message: "Incorrect Username or Email!"
        })
    }

    /********** System Email link Send Start **************/

    let email_parametars = {
        APP_URL: process.env.APP_URL,
        reset_password_link: process.env.APP_BUILD_URL + "/reset-password?token=" + userResponse.user_uuid,
    };

    let email_template = fs.readFileSync(appRoot + "/src/Services/Views/email-templates/ForgotPasswordTemplate.html", "utf8");

    email_template = email_template.replace(/reset_password_link|APP_URL/gi, function (matched) {
        return email_parametars[matched];
    });
    console.log(email_template);
    let mailOptions = {
        from: process.env.MAIL_FROM_ADDRESS,
        to: userResponse.email,
        subject: "BSS - Forgot Password",
        html: email_template,
    };

    SendEmail(mailOptions)

        .then((info) => {
            console.log("Nodemailer Email sent -------------------- ", info.response);
        })
        .catch((error) => {
            console.log("Nodemailer error ---------- ", error);
        });

    /********* End System Email link Send  **************/

    res.json({
        status: 200,
        success: true,
        message: "Please check your email to verify your account!"
    })

}

module.exports.ResetPassword = async (req, res) => {
    const user_detail = req.body;

    if (user_detail.password !== user_detail.confirm_password) {
        return res.json({
            status: 400,
            success: false,
            message: "Password doesn't match!",
        });
    }
    if (user_detail.password) {
        user_detail.original_password = user_detail.password;
        user_detail.password = await bcrypt.hash(user_detail.password, 10);
    }

    const user = await Users.scope("withPassword").findOne({
        where: {
            user_uuid: user_detail.user_uuid,
        },
    });

    if (user) {

        Users.update(user_detail, {
            where:
                { user_uuid: user_detail.user_uuid }, returning: true, raw: true
        })
            .then(async (response) => {
                //Update the user password in the school database
                try {
                    const { country_host, school_code } = response[1][0];


                    const BssUsersModel = await BssUsers(await configNewDb({ country_host, school_code,sync_db: false }));

                    BssUsersModel.update(user_detail, { where: { user_uuid: user_detail.user_uuid } });

                    /************* System Email Start for only confirmation**********************/

                    let email_parametars = {
                        user_name: user.first_name + " " + user.last_name,
                        APP_URL: process.env.APP_URL,
                    };
                    let email_template = fs.readFileSync(appRoot + "/src/Services/Views/email-templates/ResetPasswordSuccessfully.html", "utf8");

                    email_template = email_template.replace(/user_name|APP_URL/gi, function (matched) {
                        return email_parametars[matched];
                    });
                    let mailOptions = {
                        from: process.env.MAIL_FROM_ADDRESS,
                        to: user.email,
                        subject: "BSS - Reset Password Successfully!",
                        html: email_template,
                    };
                    SendEmail(mailOptions)
                        .then((info) => {
                            console.log("Nodemailer Email sent-------------------", info.response);
                        })
                        .catch((error) => {
                            console.log("Nodemailer error ----------------", error);
                        });
                    /***********************End System Email **********************/
                    return res.json({
                        status: 200,
                        success: true,
                        message: "Password updated successfully!",
                    });
                } catch (error) {
                    console.log(error);
                    return res.json({
                        status: 400,
                        success: false,
                        error: error,
                        message: "Something went wrong. Please try again or reach out to support if the issue persists."
                    });

                }
            })
            .catch((error) => {
                console.log(error);
                return res.json({
                    status: 400,
                    success: false,
                    message: "Something went wrong. Please try again or reach out to support if the issue persists."
                });
            });
    } else {
        res.json({
            status: 400,
            success: false,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });
    }
}