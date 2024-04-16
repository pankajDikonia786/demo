const Sq = require("sequelize");
const fs = require("fs");
const { configNewDb } = require("../../../libs/NewDb");
const { generatePassword, SendEmail } = require("../../../libs/Helper")
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { BssParents, BssStudents, BssDormitories } = require("../../Models/common");
const { SchoolDetails } = require("../../Models/admin");


module.exports.LoginStudentLiberty = async (req, res) => {
    try {
        let parent_detail = req.body;
        let { username, password, device_token, device_name } = parent_detail;
        const school_code = username.split("_")[0];
        const id = username.split("_")[1];

        const schoolDetailsRes = await SchoolDetails.findOne({ where: { school_code }, attributes: ["school_detail_id", "school_name", "school_code", "school_logo","country_host"] });
        if (!schoolDetailsRes || !/^\d+$/.test(id)) {
            return res.json({
                status: 400,
                success: false,
                message: "Username or Password is incorrect",
            });
        };

        const BssParentsModel = await BssParents(await configNewDb({
            school_code: school_code, country_host: schoolDetailsRes.country_host,
            sync_db: true
        }));
        const BssStudentsModel = await BssStudents(await configNewDb({
            school_code: school_code, country_host: schoolDetailsRes.country_host,
            sync_db: false
        }));
        const BssDormitoriesModel = await BssDormitories(await configNewDb({
            school_code: school_code, country_host: schoolDetailsRes.country_host,
            sync_db: false
        }));

        const studentsRes = await BssStudentsModel.scope("withPassword").findOne({
            where: {
                [Sq.Op.or]: [Sq.where(Sq.fn('PGP_SYM_DECRYPT', Sq.col('student_username'),
                    PG_ENCRYPT_KEY), username),
                ]
            },
            include: [{
                model: BssParentsModel, as: "parent_data",
                required: true,
                attributes: ["parent_id", "parent_uuid", "father_name", "father_password",
                    "mother_name", "mother_password", "parent_device_name", "parent_device_token",
                    [Sq.fn("PGP_SYM_DECRYPT", Sq.col("father_username"), PG_ENCRYPT_KEY), "father_username"],
                    [Sq.fn("PGP_SYM_DECRYPT", Sq.col("mother_username"), PG_ENCRYPT_KEY), "mother_username"],
                    [Sq.fn("PGP_SYM_DECRYPT", Sq.col("mother_phone"), PG_ENCRYPT_KEY), "mother_phone"],
                    [Sq.fn("PGP_SYM_DECRYPT", Sq.col("mother_home_phone"), PG_ENCRYPT_KEY), "mother_home_phone"],
                    [Sq.fn("PGP_SYM_DECRYPT", Sq.col("mother_work_phone"), PG_ENCRYPT_KEY), "mother_work_phone"],
                    [Sq.fn("PGP_SYM_DECRYPT", Sq.col("father_phone"), PG_ENCRYPT_KEY), "father_phone"],
                    [Sq.fn("PGP_SYM_DECRYPT", Sq.col("father_home_phone"), PG_ENCRYPT_KEY), "father_home_phone"],
                    [Sq.fn("PGP_SYM_DECRYPT", Sq.col("father_work_phone"), PG_ENCRYPT_KEY), "father_work_phone"]
                ],
            },
            {
                model: BssDormitoriesModel, as: "dormitory_data", attributes: {
                    include: [[
                        Sq.fn('PGP_SYM_DECRYPT', Sq.col('dormitory_name'), PG_ENCRYPT_KEY), "dormitory_name"
                    ]], exclude: ["dormitory_type", "bio_note", "dormitory_image", "dormitory_address", "created_by",
                        "updated_by", "deleted_by", "created_date", "updated_date", "deleted_date"]
                },
            }],
        });

        if (!studentsRes || !await (bcrypt.compare(password, studentsRes.student_password))) {
            return res.json({
                status: 400,
                success: false,
                message: "Username or Password is incorrect",
            });
        };

        let login_user_type = "student";

        let jwt_data_obj = {
            student_id: studentsRes.student_id,
            login_user_type
        };

        await BssStudentsModel.update({ device_token, device_name },
            { where: { student_id: studentsRes.student_id } });
        //create token
        let token = jwt.sign(jwt_data_obj, "Bss_Super_Secret");

        studentsRes.student_password = null
        studentsRes.parent_data ? studentsRes.parent_data.father_password = null : "";
        studentsRes.parent_data ? studentsRes.parent_data.mother_password = null : "";

        return res.json({
            status: 200,
            success: true,
            token: token,
            data: { student_data: studentsRes, login_user_type, school_detail: schoolDetailsRes, },
            message: "Logged in Successfully!",
        });
    } catch (error) {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });
    }
};
module.exports.LoginParentLiberty = async (req, res) => {
    try {
        let parent_detail = req.body;
        let { username, password, device_token, device_name } = parent_detail;
        const school_code = username.split("_")[0];
        const id = username.split("_")[1];

        const schoolDetailsRes = await SchoolDetails.findOne({
            where: { school_code }, attributes: ["school_detail_id",
                "school_name", "school_code", "school_logo", "country_host"]
        });
        if (!schoolDetailsRes || !/^\d+$/.test(id)) {
            return res.json({
                status: 400,
                success: false,
                message: "Username or Password is incorrect",
            });
        };

        const BssParentsModel = await BssParents(await configNewDb({
            school_code: school_code, country_host: schoolDetailsRes.country_host,
            sync_db: false
        }));
        const BssStudentsModel = await BssStudents(await configNewDb({
            school_code: school_code, country_host: schoolDetailsRes.country_host,
            sync_db: false
        }));
        const BssDormitoriesModel = await BssDormitories(await configNewDb({
            school_code: school_code, country_host: schoolDetailsRes.country_host,
            sync_db: false
        }));
        //relation
        BssParentsModel.hasMany(await BssStudentsModel, {
            as: "parent_students",
            foreignKey: "parent_id",
        });

        const parentsRes = await BssParentsModel.scope("withPassword").findOne({
            where: {
                [Sq.Op.or]: [
                    Sq.where(Sq.fn('PGP_SYM_DECRYPT', Sq.col('father_username'),
                        PG_ENCRYPT_KEY), username),
                    Sq.where(Sq.fn('PGP_SYM_DECRYPT', Sq.col('mother_username'),
                        PG_ENCRYPT_KEY), username),
                ]
            },
            attributes: ["parent_id", "parent_uuid", "father_name", "father_password",
                "mother_name", "mother_password", "parent_device_name", "parent_device_token",
                [Sq.fn("PGP_SYM_DECRYPT", Sq.col("father_username"), PG_ENCRYPT_KEY), "father_username"],
                [Sq.fn("PGP_SYM_DECRYPT", Sq.col("mother_username"), PG_ENCRYPT_KEY), "mother_username"],
                [Sq.fn("PGP_SYM_DECRYPT", Sq.col("mother_phone"), PG_ENCRYPT_KEY), "mother_phone"],
                [Sq.fn("PGP_SYM_DECRYPT", Sq.col("mother_home_phone"), PG_ENCRYPT_KEY), "mother_home_phone"],
                [Sq.fn("PGP_SYM_DECRYPT", Sq.col("mother_work_phone"), PG_ENCRYPT_KEY), "mother_work_phone"],
                [Sq.fn("PGP_SYM_DECRYPT", Sq.col("father_phone"), PG_ENCRYPT_KEY), "father_phone"],
                [Sq.fn("PGP_SYM_DECRYPT", Sq.col("father_home_phone"), PG_ENCRYPT_KEY), "father_home_phone"],
                [Sq.fn("PGP_SYM_DECRYPT", Sq.col("father_work_phone"), PG_ENCRYPT_KEY), "father_work_phone"]
            ],
            include: [{
                model: BssStudentsModel, as: "parent_students",
                attributes: ["student_id", "student_uuid", "student_first_name", "student_last_name", "preferred_name", "permitted_student_app_signout",
                    "student_avatar", "gender", "class_name", "class_id", "dormitory_id", "student_age", "device_name", "device_token",
                    "exclude_automatic_host", "show_parent_detail_app", "is_student_activate",
                    [Sq.fn("PGP_SYM_DECRYPT", Sq.col("unique_pin"), PG_ENCRYPT_KEY), "unique_pin"],
                    [Sq.fn("PGP_SYM_DECRYPT", Sq.col("student_email"), PG_ENCRYPT_KEY), "student_email"],
                    [Sq.fn("PGP_SYM_DECRYPT", Sq.col("sporting_house"), PG_ENCRYPT_KEY), "sporting_house"],
                    [Sq.fn("PGP_SYM_DECRYPT", Sq.col("laundry_number"), PG_ENCRYPT_KEY), "laundry_number"],
                    [Sq.fn("PGP_SYM_DECRYPT", Sq.col("date_of_birth"), PG_ENCRYPT_KEY), "date_of_birth"],
                    [Sq.fn("PGP_SYM_DECRYPT", Sq.col("kiosk_mode_pin"), PG_ENCRYPT_KEY), "kiosk_mode_pin"],
                ],
                include: {
                    model: BssDormitoriesModel, as: "dormitory_data", attributes: {
                        include: [[
                            Sq.fn('PGP_SYM_DECRYPT', Sq.col('dormitory_name'), PG_ENCRYPT_KEY), "dormitory_name"
                        ]], exclude: ["dormitory_type", "bio_note", "dormitory_image", "dormitory_address", "created_by",
                            "updated_by", "deleted_by", "created_date", "updated_date", "deleted_date"]
                    },
                }
            },],
            hooks: false,
        });
        if (!parentsRes) {
            return res.json({
                status: 400,
                success: false,
                message: "Incorrect Username!"
            });
        };
        let user_password;
        let login_user_type;
        if (username == parentsRes.father_username) {
            login_user_type = "father";
            user_password = parentsRes.father_password;

        } else if (username == parentsRes.mother_username) {
            login_user_type = "mother";
            user_password = parentsRes.mother_password;
        };

        if (!await (bcrypt.compare(password, user_password))) {
            return res.json({
                status: 400,
                success: false,
                message: "Username or Password is incorrect",
            });
        };
        let jwt_data_obj = {};

        if (login_user_type == "father" || login_user_type == "mother") {

            await BssParentsModel.update({ parent_device_token: device_token, parent_device_name: device_name },
                { where: { parent_uuid: parentsRes.parent_uuid } });
            if (login_user_type == "father") {
                jwt_data_obj = {
                    parent_id: parentsRes.parent_id,
                    login_user_type: "father"
                };
            } else {
                jwt_data_obj = {
                    parent_id: parentsRes.parent_id,
                    login_user_type: "mother"
                };
            };
        };
        //create token
        let token = jwt.sign(jwt_data_obj, "Bss_Super_Secret");

        parentsRes ? parentsRes.father_password = null : "";
        parentsRes ? parentsRes.mother_password = null : "";

        return res.json({
            status: 200,
            success: true,
            token: token,
            data: { parent_data: parentsRes, login_user_type, school_detail: schoolDetailsRes, },
            message: "Logged in Successfully!",
        });
    } catch (error) {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });
    }
};
module.exports.ForgotParentPassword = async (req, res) => {
    try {
        let parent_detail = req.body;
        let { username, } = parent_detail;
        const school_code = username.split("_")[0];
        const id = username.split("_")[1];

        const schoolDetailsRes = await SchoolDetails.findOne({ where: { school_code } });

        if (!schoolDetailsRes || !/^\d+$/.test(id)) {
            return res.json({
                status: 400,
                success: false,
                message: "Incorrect Username!",
            });
        };

        const BssParentsModel = await BssParents(await configNewDb({
            school_code: school_code, country_host: schoolDetailsRes.country_host,
            sync_db: false
        }));

        const parentsRes = await BssParentsModel.scope("withPassword").findOne({
            where: {
                [Sq.Op.or]: [
                    Sq.where(Sq.fn('PGP_SYM_DECRYPT', Sq.col('father_username'),
                        PG_ENCRYPT_KEY), username),
                    Sq.where(Sq.fn('PGP_SYM_DECRYPT', Sq.col('mother_username'),
                        PG_ENCRYPT_KEY), username),
                ]
            },
            attributes: ["parent_id", "parent_uuid", "father_name", "father_password",
                "mother_name", "mother_password",
                [Sq.fn("PGP_SYM_DECRYPT", Sq.col("father_username"), PG_ENCRYPT_KEY), "father_username"],
                [Sq.fn("PGP_SYM_DECRYPT", Sq.col("father_email"), PG_ENCRYPT_KEY), "father_email"],
                [Sq.fn("PGP_SYM_DECRYPT", Sq.col("mother_username"), PG_ENCRYPT_KEY), "mother_username"],
                [Sq.fn("PGP_SYM_DECRYPT", Sq.col("mother_email"), PG_ENCRYPT_KEY), "mother_email"]
            ],
            hooks: false
        });

        if (!parentsRes) {
            return res.json({
                status: 400,
                success: false,
                message: "Incorrect Username!"
            })
        };

        let user_email;
        let parentUpdateObj = {};
        let newGeneratedPassword = await generatePassword();
        const bcryptedPassword = await bcrypt.hash(newGeneratedPassword, 10);

        if (username == parentsRes.father_username) {
            user_email = parentsRes.father_email;
            parentUpdateObj = {
                father_password: bcryptedPassword
            };
        } else if (username == parentsRes.mother_username) {
            user_email = parentsRes.mother_email;
            parentUpdateObj = {
                mother_password: bcryptedPassword
            };
        };

        if (Object.keys(parentUpdateObj).length == !0) {
            await BssParentsModel.update(parentUpdateObj,
                { where: { parent_uuid: parentsRes.parent_uuid } });
        };
        /********** System Email link Send Start **************/

        let email_parametars = {
            user_name: username,
            new_password: newGeneratedPassword,
            APP_URL: process.env.APP_URL,
        };
        let email_template = fs.readFileSync(appRoot + "/src/Services/Views/email-templates/MobileParentOrStudentForgotPassword.html", "utf8");

        email_template = email_template.replace(/user_name|new_password|APP_URL/gi, function (matched) {
            return email_parametars[matched];
        });

        let mailOptions = {
            from: process.env.MAIL_FROM_ADDRESS,
            to: user_email,
            subject: `BSS -Parents Forgot Password!`,
            html: email_template,
        };
        SendEmail(mailOptions).then((info) => {
            console.log("Nodemailer Email sent -------------------- ", info.response);
        }).catch((error) => {
            console.log("Nodemailer error ---------- ", error);
        });

        /********* End System Email link Send  **************/
        res.json({
            status: 200,
            success: true,
            message: "Please check your email to verify your account!"
        })

    } catch (error) {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."

        });
    };

};
module.exports.ForgotStudentPassword = async (req, res) => {
    try {
        let parent_detail = req.body;
        let { username, } = parent_detail;
        const school_code = username.split("_")[0];
        const id = username.split("_")[1];

        const schoolDetailsRes = await SchoolDetails.findOne({ where: { school_code } });

        if (!schoolDetailsRes || !/^\d+$/.test(id)) {
            return res.json({
                status: 400,
                success: false,
                message: "Incorrect Username!",
            });
        };
        const BssStudentsModel = await BssStudents(await configNewDb({
            school_code: school_code, country_host: schoolDetailsRes.country_host,
            sync_db: false
        }));

        const studentsRes = await BssStudentsModel.scope("withPassword").findOne({
            where: {
                [Sq.Op.or]: [
                    Sq.where(Sq.fn('PGP_SYM_DECRYPT', Sq.col('student_username'),
                        PG_ENCRYPT_KEY), username)]
            },
            attributes: ["student_id", "student_password", [Sq.fn("PGP_SYM_DECRYPT", Sq.col("student_username"), PG_ENCRYPT_KEY), "student_username"],
                [Sq.fn("PGP_SYM_DECRYPT", Sq.col("student_email"), PG_ENCRYPT_KEY), "student_email"]],
            hooks: false
        });

        if (!studentsRes) {
            return res.json({
                status: 400,
                success: false,
                message: "Incorrect Username!"
            });
        };
        //generate new password
        let newGeneratedPassword = await generatePassword();
        const bcryptedPassword = await bcrypt.hash(newGeneratedPassword, 10);

        //update student password
        await BssStudentsModel.update({
            student_password: bcryptedPassword
        }, { where: { student_id: studentsRes.student_id } });

        /********** System Email link Send Start **************/

        let email_parametars = {
            user_name: username,
            new_password: newGeneratedPassword,
            APP_URL: process.env.APP_URL,
        };

        let email_template = fs.readFileSync(appRoot + "/src/Services/Views/email-templates/MobileParentOrStudentForgotPassword.html", "utf8");
        email_template = email_template.replace(/user_name|new_password|APP_URL/gi, function (matched) {
            return email_parametars[matched];
        });

        let mailOptions = {
            from: process.env.MAIL_FROM_ADDRESS,
            to: studentsRes.student_email,
            subject: `BSS - Student Forgot Password!`,
            html: email_template,
        };

        SendEmail(mailOptions).then((info) => {
            console.log("Nodemailer Email sent -------------------- ", info.response);
        }).catch((error) => {
            console.log("Nodemailer error ---------- ", error);
        });

        /********* End System Email link Send  **************/
        res.json({
            status: 200,
            success: true,
            message: "Please check your email to verify your account!"
        })
    } catch (error) {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."

        });
    };

};
