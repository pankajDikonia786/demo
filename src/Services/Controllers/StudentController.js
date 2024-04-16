const fs = require("fs");
const bcrypt = require("bcrypt");
const Sq = require("sequelize");
const fastCsv = require("fast-csv");
const PDFDocument = require("pdfkit-table");
const moment = require("moment");
const { DateTime } = require("luxon");
const { generatePassword, SendEmail, DeleteFile, convert_key_array, StudentsCsvAttributes, getAge } = require("../../libs/Helper");
const { BssStudents, BssParents, BssParentAddress, BssClasses, BssStudentAllergy, BssStudentGeneric, BssDormitories,
    BssStudentGrounded, BssStuCurrrentLocation, BssStudentAttendance, BssStuLocChangeNotifications, BssDiaryComments,
    BssUsers, BssHost, BssStudentHost, BssSchoolDetails, } = require("../Models/common");
const { SystemLogsFun } = require("../../libs/Helper");
const { response } = require("express");
const { error } = require("console");

// compress-algo=1, cipher-algo=aes128
//add school_id pending 
module.exports.CreateStudentAndParents = async (req, res) => {
    try {
        const login_user = req.login_user;
        const student_details = req.body;
        let { parent_address_data, parent_id } = student_details;
        const school_code = req.headers.school_code;
        const config_sequelize = req.config_sequelize;
        let file_data = req.file;
        student_details.created_by = login_user.user_id;


        file_data?.path ? student_details.student_avatar = file_data?.path : student_details.student_avatar = "";

        const BssStudentsModel = await BssStudents(config_sequelize);
        const BssHostModel = await BssHost(config_sequelize);
        const BssStudentHostModel = await BssStudentHost(config_sequelize);
        const BssParentAddressModel = await BssParentAddress(config_sequelize);

        const studentsRes = await BssStudentsModel.findOne(
            {
                where: {
                    [Sq.Op.or]: [Sq.where(Sq.fn('PGP_SYM_DECRYPT', Sq.col('student_email'),
                        PG_ENCRYPT_KEY), "LIKE", student_details.student_email),
                    Sq.where(Sq.fn('PGP_SYM_DECRYPT', Sq.col('kiosk_mode_pin'), PG_ENCRYPT_KEY), "LIKE",
                        student_details.kiosk_mode_pin)]
                },
            });
        if (studentsRes) {

            const is_already_exist = { value: studentsRes.student_email == student_details.student_email ? "email" : "Kiosk mode pin" }
            return res.send({
                status: 400,
                success: false,
                message: `Student ${is_already_exist.value} is already exists. Please try a different ${is_already_exist.value == "email" ? "email address" : is_already_exist.value} !`
            });
        };
        let parentsResponse;

        let generate_student_password;
        let generate_mother_password;
        let generate_father_password;

        let mother_username;
        let father_username;
        generate_student_password = await generatePassword();
        student_details.student_password = await bcrypt.hash(generate_student_password, 10);

        // find student with duplicate preferred name 
        const preferred_name = student_details.preferred_name;
        let responseStudents = await BssStudentsModel.findOne(
            {
                where: {
                    [Sq.Op.or]: Sq.where(Sq.fn("LOWER", Sq.col("preferred_name"),), "LIKE", preferred_name.toLowerCase()),
                }
            });
        if (responseStudents) {
            student_details.is_duplicate = true
            let sys_obj = {
                user_id: login_user.user_id,
                action: "updated",
                html_info: `A  duplicate student <a href ="GetAllDuplicateStudents"> was founded by system.`
            }
            SystemLogsFun(sys_obj, config_sequelize)
        }

        //encrypted fields should not be null
        student_details.student_username = Sq.fn("PGP_SYM_ENCRYPT ", "", PG_ENCRYPT_KEY,);
        student_details.unique_pin = Sq.fn("PGP_SYM_ENCRYPT ", "", PG_ENCRYPT_KEY,)

        /*****  Create student  *********/
        !parent_id ? delete student_details.parent_id : "";
        const response = await BssStudentsModel.create(student_details, { individualHooks: true, login_user: login_user, })
        const student_id = response.student_id;
        const unique_pin = school_code.slice(0, 3) + student_id;
        const student_username = `${school_code}_${response.student_id}_${response.student_first_name.split(" ")[0]}`
        await BssStudentsModel.update({
            student_username: Sq.fn("PGP_SYM_ENCRYPT ", student_username, PG_ENCRYPT_KEY,),
            unique_pin: Sq.fn("PGP_SYM_ENCRYPT ", unique_pin, PG_ENCRYPT_KEY,),

        }, { where: { student_id } });

        //create student allergy details if student allergic status true
        if (student_details.student_allergy_status === "yes" && student_details.allergy_data) {
            student_details.student_id = response.student_id;

            let allergy_data;
            //for test at postman
            allergy_data = student_details.allergy_data;
            // allergy_data = JSON.parse(student_details.allergy_data);
            const BssStudentAllergyModel = await BssStudentAllergy(config_sequelize);

            allergy_data.forEach((allergyValues, allergyIndex) => {
                //encrypt values
                allergy_data[allergyIndex].allergy_name = Sq.fn("PGP_SYM_ENCRYPT ", allergy_data[allergyIndex].allergy_name, PG_ENCRYPT_KEY);
                allergy_data[allergyIndex].allergy_info = Sq.fn("PGP_SYM_ENCRYPT ", allergy_data[allergyIndex]?.allergy_info ? allergy_data[allergyIndex].allergy_info : "", PG_ENCRYPT_KEY);
                allergy_data[allergyIndex].allergy_note = Sq.fn("PGP_SYM_ENCRYPT ", allergy_data[allergyIndex]?.allergy_note ? allergy_data[allergyIndex].allergy_note : "", PG_ENCRYPT_KEY);

                allergy_data[allergyIndex].student_id = student_id;
            })
            await BssStudentAllergyModel.bulkCreate(allergy_data);

        };
        //create student parent if not exists parent id
        if (!parent_id || parent_id == "") {

            if (student_details.father_name && student_details.father_name !== "") {

                generate_father_password = await generatePassword();
                father_username = `${school_code}_${response.student_id}_${student_details.father_name.split(" ")[0]}`;
                student_details.father_password = await bcrypt.hash(generate_father_password, 10);
                //encrypt users name
                student_details.father_username = Sq.fn("PGP_SYM_ENCRYPT ", father_username, PG_ENCRYPT_KEY,)
            };
            if (student_details.mother_name && student_details.mother_name !== "") {

                generate_mother_password = await generatePassword();
                student_details.mother_password = await bcrypt.hash(generate_mother_password, 10);
                mother_username = `${school_code}_${response.student_id}_${student_details.mother_name.split(" ")[0]}`
                //encrypt users name
                student_details.mother_username = Sq.fn("PGP_SYM_ENCRYPT ", mother_username, PG_ENCRYPT_KEY,)

            };

            const BssParentsModel = await BssParents(config_sequelize);
            parentsResponse = await BssParentsModel.create(student_details, { individualHooks: true });

            await BssStudentsModel.update({ parent_id: parentsResponse.parent_id }, { where: { student_id: response.student_id } });
            /******   create mother and father address data if mother or father details available*********/
            if (parent_address_data) {

                // parent_address_data = JSON.parse(parent_address_data);
                parent_address_data.forEach(async (parent_address_val, parent_address_ind,) => {

                    parent_address_data[parent_address_ind].parent_id = parentsResponse.parent_id,
                        parent_address_data[parent_address_ind].created_by = login_user.user_id;
                    await BssParentAddressModel.create(parent_address_data[parent_address_ind],);
                });
            };
        };
        let parent_as_host = student_details.parent_as_host;
        // parent_as_host = JSON.parse(parent_as_host);

        //Create host and relation if not already exists
        if (student_details.host_id == "" && Object.keys(student_details.host_data).length !== 0 || parent_as_host && !parent_id) {
            if (student_details.host_id == "" && Object.keys(student_details.host_data).length !== 0 || student_details.host_data == {}) {

                // student_details.host_data = JSON.parse(student_details.host_data);
                const hostResponse = await BssHostModel.create(student_details.host_data);
                //relation table
                await BssStudentHostModel.create({
                    host_id: hostResponse.host_id, student_id: student_id,
                    host_relation: student_details.host_data.host_relation,
                    is_host_approved: student_details.host_data.is_host_approved,
                });
            };
            //parent as host relation
            if (parent_as_host && !parent_id) {
                parent_as_host.forEach((parent_host_val, parent_host_ind) => {
                    parent_as_host[parent_host_ind].parent_id = parentsResponse.parent_id;
                    parent_as_host[parent_host_ind].student_id = student_id;
                });
                await BssStudentHostModel.bulkCreate(parent_as_host);
            };
        };

        ////////////////////////create host relation if host exists/////////////
        if (student_details.host_id || parent_as_host && parent_id) {
            //parent as host relation
            if (parent_as_host && parent_id) {
                parent_as_host.forEach((parent_host_val, parent_host_ind) => {
                    parent_as_host[parent_host_ind].parent_id = parent_id;
                    parent_as_host[parent_host_ind].student_id = student_id;
                });
                await BssStudentHostModel.bulkCreate(parent_as_host);
            };
            if (student_details.host_id) {
                await BssStudentHostModel.create({
                    host_id: student_details.host_id, student_id: student_id,
                    host_relation: student_details.host_data.host_relation,
                    is_host_approved: student_details.host_data.is_host_approved,
                });
            };
        };

        /************* System Email Start for send login info **********************/
        let emailsDetails = [{
            email_name: student_details.student_first_name + student_details.student_last_name,
            email_address: student_details.student_email,
            email_username: student_username,
            email_password: generate_student_password,
            email_template_name: "StudentRegistration.html",
            email_subject: "Student Login"

        },];

        if (!student_details?.parent_id || student_details?.parent_id == "") {
            if (student_details.mother_name)
                emailsDetails.push({
                    email_name: student_details.mother_name,
                    email_address: student_details.mother_email,
                    email_username: mother_username,
                    email_password: generate_mother_password,
                    email_template_name: "ParentsRegistration.html",
                    email_subject: "Parents Login"
                },);
            if (student_details.father_name)
                emailsDetails.push({
                    email_name: student_details.father_name,
                    email_address: student_details.father_email,
                    email_username: father_username,
                    email_password: generate_father_password,
                    email_template_name: "ParentsRegistration.html",
                    email_subject: "Parents Login"
                });
        };
        emailsDetails.forEach((emailValues) => {

            let email_parametars = {
                email_name: emailValues.email_name,
                email_username: emailValues.email_username,
                email_password: emailValues.email_password,
                school_code: school_code,
                school_name: student_details.school_name,
                APP_URL: process.env.APP_URL,
            };
            let email_template = fs.readFileSync(appRoot + `/src/Services/Views/email-templates/${emailValues.email_template_name}`, "utf8");

            email_template = email_template.replace(/email_name|email_username|email_password|school_code|school_name|APP_URL/gi, function (matched) {
                return email_parametars[matched];
            });
            let mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS,
                to: emailValues.email_address,
                subject: `BSS -${emailValues.email_subject} Registration Successfully!`,
                html: email_template,
            };
            SendEmail(mailOptions)
                .then((info) => {
                    console.log("Nodemailer Email sent-------------------", info.response);
                })
                .catch((error) => {
                    console.log("Nodemailer error ----------------", error);
                });
        });
        /***********************End System Email **********************/
        return res.json({
            status: 200,
            success: true,
            message: "Student Registration Successfully!"
        });
    } catch (error) {
        console.log(error);
        return res.json({
            status: 400,
            success: false,
            error: error.message,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });
    };
};

module.exports.GetAllStudents = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    // const studnet =req.body

    const { page, limit, sort, order, search, gender, dormitory_id, class_id, is_student_activate, student_age } = req.query;

    let where_data = {};
    let query_data = {};
    if (gender) {
        where_data = {
            ...where_data,
            gender: gender,
        }
    };
    if (dormitory_id) {
        where_data = {
            ...where_data,
            dormitory_id: dormitory_id
        }

    };
    if (is_student_activate === "true" || is_student_activate === true) {
        where_data = {
            ...where_data,
            is_student_activate: true
        }

    };
    if (is_student_activate === "false" || is_student_activate === false) {
        where_data = {
            ...where_data,
            is_student_activate: false
        }
    };
    if (class_id) {
        where_data = {
            ...where_data,
            class_id: class_id
        }

    };
    if (student_age) {
        where_data = {
            ...where_data,
            student_age: student_age
        }
    }

    if (search) {
        where_data = {
            ...where_data,
            [Sq.Op.or]: [
                //check the first name or last name with case insensitivity
                Sq.where(Sq.fn("concat", Sq.col("student_first_name"), " ", Sq.col("student_last_name")), { [Sq.Op.iLike]: `%${search}%` }),

                Sq.where(Sq.fn("LOWER", Sq.fn('PGP_SYM_DECRYPT', Sq.col("student_email"), PG_ENCRYPT_KEY)), "LIKE", search.toLowerCase()),

            ],
        };
    }

    if (page && limit) {

        query_data.offset = 0 + (page - 1) * limit;
        query_data.limit = limit;

    };
    if (sort && order) {

        query_data.order = [[sort, order]]

    };

    const BssDormitoriesModel = await BssDormitories(await config_sequelize);

    const BssStudentsModel = await BssStudents(config_sequelize);
    BssStudentsModel.findAndCountAll({
        where: where_data, ...query_data,
        attributes: {
            include: [[
                Sq.fn('PGP_SYM_DECRYPT', Sq.col('student_phone'), PG_ENCRYPT_KEY), "student_phone",
                // Sq.fn('PGP_SYM_DECRYPT', Sq.col('unique_pin'), PG_ENCRYPT_KEY), "unique_pin",

            ]],
            exclude: ["student_avatar", "student_email", "gender", "campus_name", "sporting_house",
                "laundry_number", "tutor_name", "tutor_email", "student_age", "date_of_birth", "kiosk_mode_pin",
                "first_point_contact", "first_point_email", "allergy_unauth_access", "student_allergy_status",]

        },
        include: {
            model: BssDormitoriesModel, as: "dormitory_data",
            attributes: {
                include: [[
                    Sq.fn('PGP_SYM_DECRYPT', Sq.col('dormitory_name'), PG_ENCRYPT_KEY), "dormitory_name"
                ]],
                exclude: ["dormitory_type", "bio_note", "dormitory_image", "dormitory_address", "created_by",
                    "updated_by", "deleted_by", "created_date", "updated_date", "deleted_date"]
            }
        }, hooks: false
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get all Students details successfully!"
        })

    }).catch((error) => {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."

        })
    })
};


module.exports.GetStudentAndParentById = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const { student_uuid } = req.query;
    const BssUsersModel = await BssUsers(config_sequelize);
    const BssDormitoriesModel = await BssDormitories(config_sequelize);
    const BssStudentsModel = await BssStudents(config_sequelize);
    const BssStudentAllergyModel = await BssStudentAllergy(config_sequelize);
    const BssParentAddressModel = await BssParentAddress(config_sequelize);
    const BssHostModel = await BssHost(config_sequelize);
    const BssStudentHostModel = await BssStudentHost(config_sequelize);

    BssStudentsModel.findOne({
        where: { student_uuid },

        attributes: {
            exclude: ["created_by", "updated_by", "deleted_by",
                "created_date", "updated_date", "deleted_date"],
        },
        include: [{
            model: await BssParents(config_sequelize), as: "parent_data",
            attributes: [
                "father_name", "mother_name", "parent_uuid", "parent_id",
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('father_email'), PG_ENCRYPT_KEY), "father_email"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('father_phone'), PG_ENCRYPT_KEY), "father_phone"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('father_home_phone'), PG_ENCRYPT_KEY), "father_home_phone"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('father_work_phone'), PG_ENCRYPT_KEY), "father_work_phone"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('mother_email'), PG_ENCRYPT_KEY), "mother_email"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('mother_phone'), PG_ENCRYPT_KEY), "mother_phone"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('mother_home_phone'), PG_ENCRYPT_KEY), "mother_home_phone"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('mother_work_phone'), PG_ENCRYPT_KEY), "mother_work_phone"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('salutation'), PG_ENCRYPT_KEY), "salutation"]
            ],
            include: [{
                model: BssParentAddressModel, as: "parent_address",
                attributes: ["parent_address_id", "parent_address_type", "parent_country", [Sq.fn('PGP_SYM_DECRYPT', Sq.col('address_line1'), PG_ENCRYPT_KEY), "address_line1"],
                    [Sq.fn('PGP_SYM_DECRYPT', Sq.col('address_line2'), PG_ENCRYPT_KEY), "address_line2"],
                    [Sq.fn('PGP_SYM_DECRYPT', Sq.col('address_line3'), PG_ENCRYPT_KEY), "address_line3"],
                    [Sq.fn('PGP_SYM_DECRYPT', Sq.col('address_line4'), PG_ENCRYPT_KEY), "address_line4"],
                    [Sq.fn('PGP_SYM_DECRYPT', Sq.col('parent_postcode'), PG_ENCRYPT_KEY), "parent_postcode"]]
            },
            {
                model: BssStudentHostModel, as: "parents_as_host", attributes: ["student_host_uuid", "student_host_id", "parent_type",
                    "host_relation", "host_status", "is_host_approved", "student_host_comment"]
            }
            ]
        },
        {
            model: BssHostModel, as: "stu_host_data",
            attributes: ["host_id", "host_uuid", "host_name", "remark_parents", "remark_boarding", "remark_host",
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('host_email'), PG_ENCRYPT_KEY), "host_email"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('host_contact'), PG_ENCRYPT_KEY), "host_contact"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('host_address'), PG_ENCRYPT_KEY), "host_address"],
            ],
            through: {
                attributes: [],
            },
            include: {
                model: BssStudentHostModel, as: "stu_host",
                attributes: ["student_host_uuid", "is_host_approved", "student_host_comment", "host_relation", "host_status"]
            }
        },
        {
            model: BssDormitoriesModel, as: "dormitory_data",
            attributes: [[Sq.fn('PGP_SYM_DECRYPT', Sq.col('dormitory_name'), PG_ENCRYPT_KEY), "dormitory_name"],
                "dormitory_uuid"]
        },
        {
            model: BssUsersModel, as: "manager_data",
            attributes: ["first_name", "last_name", "user_uuid", "user_id"]
        },
        {
            model: BssStudentAllergyModel, as: "allergy_details",
            attributes: [
                "student_allergy_uuid",
                "student_allergy_id",
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('allergy_name',), PG_ENCRYPT_KEY), "allergy_name"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('allergy_info',), PG_ENCRYPT_KEY), "allergy_info"]
            ]
        }
        ],
        // hooks:true
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Student details successfully!"
        })

    }).catch((error) => {
        console.log(error)
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."

        });
    });
};
module.exports.UpdateParentPersonal = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;
        const school_code = req.headers.school_code;
        const login_user = req.login_user;
        const parent_details = req.body;
        let { parent_address_data } = parent_details;
        const parent_uuid = parent_details.parent_uuid;
        delete parent_details.parent_uuid;
        parent_details.updated_by = login_user.user_id;

        const BssParentsModel = await BssParents(config_sequelize);

        let parentsResponse = await BssParentsModel.findOne({
            where:
                { parent_uuid: parent_uuid },
            raw: true
        },);

        let father_name;
        let response_father_name;
        let mother_name;
        let response_mother_name;

        if (parent_details.father_name) {
            father_name = parent_details.father_name.split(" ")[0];
            response_father_name = parentsResponse.father_name.split(" ")[0];
        };
        if (parent_details.mother_name) {
            mother_name = parent_details.mother_name.split(" ")[0];
            response_mother_name = parentsResponse.mother_name.split(" ")[0];
        };

        //change username if changed the first name
        if (response_father_name && (father_name !== response_father_name)
            || response_father_name && (mother_name !== response_mother_name) ||
            !response_mother_name && mother_name || !response_father_name && father_name
        ) {

            let parents_array = []
            let student_id = parentsResponse.father_username.split("_")[1];
            let father_username = `${school_code}_${student_id}_${father_name}`;//from update details
            let mother_username = `${school_code}_${student_id}_${mother_name}`;
            //create parent array for parent email detail
            if (father_name !== response_father_name) {
                parent_details.father_username = father_username;
                parents_array.push({
                    parent_username: father_username, parent_email: parentsResponse.father_email,
                    template_name: "ResetParentUserName.html"
                });
            };
            if (mother_name !== response_mother_name) {
                parent_details.mother_username = mother_username;
                parents_array.push({
                    parent_username: mother_username, parent_email: parentsResponse.mother_email,
                    template_name: "ResetParentUserName.html"
                });
            };

            if (!parentsResponse.father_email && father_name) {

                const generate_father_password = await generatePassword();
                parent_details.father_username = father_username;
                parent_details.father_password = await bcrypt.hash(generate_father_password, 10);
                parents_array.push({
                    parent_username: father_username, parent_email: parent_details.father_email,
                    parent_name: parent_details.father_name,
                    parent_password: generate_father_password, template_name: "UpdateParentRegistration.html"
                });
            };
            if (!parentsResponse.mother_email && mother_name) {

                const generate_mother_password = await generatePassword();
                parent_details.mother_username = mother_username;
                parent_details.mother_password = await bcrypt.hash(generate_mother_password, 10);
                parents_array.push({
                    parent_username: mother_username, parent_email: parent_details.mother_email,
                    parent_name: parent_details.mother_name,
                    parent_password: generate_mother_password, template_name: "UpdateParentRegistration.html"
                });
            };

            //////////////////Send email Start//////////////
            parents_array.forEach((parent_value) => {

                let email_parametars = {
                    parent_email: parent_value.parent_email,
                    parent_name: parent_value?.parent_name,
                    parent_password: parent_value?.parent_password,
                    parent_username: parent_value.parent_username,
                    school_code: school_code,
                    school_name: parent_details.school_name,
                    APP_URL: process.env.APP_URL,
                };
                let email_template = fs.readFileSync(appRoot + `/src/Services/Views/email-templates/${parent_value.template_name}`, "utf8");

                email_template = email_template.replace(/parent_email|parent_name|parent_password|parent_username|school_code|school_name|APP_URL/gi, function (matched) {
                    return email_parametars[matched];
                });
                let mailOptions = {
                    from: process.env.MAIL_FROM_ADDRESS,
                    to: parent_value.parent_email,
                    subject: `BSS -Parent ${parent_value?.parent_password ? "Login Registration" : "User Name Reset"} Successfully!`,
                    html: email_template,
                };
                SendEmail(mailOptions)
                    .then((info) => {
                        console.log("Nodemailer Email sent-------------------", info.response);
                    })
                    .catch((error) => {
                        console.log("Nodemailer error ----------------", error);
                    });
            });
        };
        //////////////////End Send Email////////////////////

        await BssParentsModel.update(parent_details, { where: { parent_uuid }, individualHooks: true });
        /******   add mother and father address data *********/
        if (parent_address_data) {
            const BssParentAddressModel = await BssParentAddress(config_sequelize);

            // parent_address_data = JSON.parse(parent_address_data);
            parent_address_data.forEach(async (parent_address_val, parent_address_ind,) => {

                if (parent_address_val.parent_address_id) {

                    const parent_address_id = parent_address_data[parent_address_ind].parent_address_id;
                    delete parent_address_data[parent_address_ind].parent_address_id;
                    parent_address_data[parent_address_ind].updated_by = login_user.user_id;
                    await BssParentAddressModel.update(parent_address_data[parent_address_ind], { where: { parent_address_id, }, individualHooks: true });
                };
                if (parent_address_val.parent_address_id == "" || !parent_address_val.parent_address_id) {
                    delete parent_address_data[parent_address_ind].parent_address_id;
                    parent_address_data[parent_address_ind].created_by = login_user.user_id;
                    parent_address_data[parent_address_ind].parent_id = parentsResponse.parent_id;

                    await BssParentAddressModel.create(parent_address_data[parent_address_ind],);
                };
            });
        };
        res.json({
            status: 200,
            success: true,
            message: "Parents details updated successfully!"
        })
    } catch (error) {
        console.log(error);
        return res.json({
            status: 400,
            success: false,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."

        });
    };
};

module.exports.RemoveParentAddress = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;
        const { parent_address_uuid, parent_address_type } = req.body;

        const BssParentAddressModel = await BssParentAddress(await config_sequelize);
        await BssParentAddressModel.destroy({ where: { parent_address_uuid } });

        res.json({
            status: 200,
            success: true,
            message: `Student ${parent_address_type.toUpperCase()} address deleted successfully!`
        });
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

module.exports.UpdateStudentPersonal = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const school_code = req.headers.school_code;
    const student_details = req.body;
    const student_uuid = student_details.student_uuid;
    const student_id = student_details.student_id;
    delete student_details.student_uuid;
    student_details.updated_by = login_user.user_id;
    const file_data = req?.file;
    const BssStudentsModel = await BssStudents(config_sequelize);


    //check if preferred name already exists

    const studentRes = await BssStudentsModel.findOne({
        where: {
            student_uuid: { [Sq.Op.ne]: student_uuid },
            [Sq.Op.or]: [{
                preferred_name: Sq.where(Sq.fn("LOWER", Sq.col("preferred_name")),
                    "LIKE", student_details.preferred_name),
            }, {
                student_email: Sq.where(Sq.fn('PGP_SYM_DECRYPT', Sq.col('student_email'),
                    PG_ENCRYPT_KEY
                ), "LIKE", student_details.student_email)
            }]
        },
    });
    if (studentRes) {
        return res.json({
            status: 400,
            success: false,
            message: `Student Preferred name or email address is already exists. Please try with different Preferred name or Email address!`

        })
    };

    let BssStudentsResponse = await BssStudentsModel.findOne({ where: { student_uuid } });

    if (typeof file_data !== "undefined" && file_data?.path) {
        student_details.student_avatar = file_data?.path

        if (BssStudentsResponse?.student_avatar) {

            let filePath = `${appRoot}/${BssStudentsResponse?.student_avatar}`;
            await DeleteFile(filePath)
        }
    }
    //change username if changed the first name and send the email
    /* Send email start */
    if (BssStudentsResponse.student_first_name.split(" ")[0] !== student_details.student_first_name.split(" ")[0] ||
        BssStudentsResponse.student_email != student_details.student_email) {
        let email_parametars = [];
        let emailDetails = {};
        let sendEmailTo = [];
        if (BssStudentsResponse.student_first_name.split(" ")[0] !== student_details.student_first_name.split(" ")[0]) {
            const student_username = `${school_code}_${student_id}_${student_details.student_first_name.split(" ")[0]}`
            student_details.student_username = student_username;
            sendEmailTo.push(student_details.student_email);


            emailDetails = {
                student_name: student_details.student_first_name + student_details.student_last_name,
                student_username: student_username,
                school_code: school_code,
                school_name: student_details.school_name,
                APP_URL: process.env.APP_URL,
                template_name: "ResetStudentUserName.html"
            }

            // email_parametars.push(emailDetails);
        };
        //if email updated then send email at new and old email address of student
        if (BssStudentsResponse.student_email != student_details.student_email) {
            sendEmailTo.push(student_details.student_email, BssStudentsResponse.student_email);
            emailDetails = {
                ...emailDetails,
                new_email: student_details.student_email,
                previous_email: BssStudentsResponse.student_email,
                template_name: "StudentEmailUpdated.html",
            }
            email_parametars.push(emailDetails, emailDetails);
        };
        email_parametars.forEach((email_parameter, email_param_ind) => {
            let email_template = fs.readFileSync(appRoot + `/src/Services/Views/email-templates/${email_parameter.template_name}`, "utf8");

            email_template = email_template.replace(/student_name|new_email|previous_email|student_username|school_code|school_name|APP_URL/gi, function (matched) {
                return email_parameter[matched];

            });
            let mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS,
                to: sendEmailTo[email_param_ind],
                subject: `BSS Student ${email_parameter?.new_email ? "Email address" : "Username"} updated Successfully!`,
                html: email_template,
            };
            console.log("::::::::::::::::::::::::::::::::::::::::::::::::", mailOptions)
            SendEmail(mailOptions)
                .then((info) => {
                    console.log("Nodemailer Email sent-------------------", info.response);
                })
                .catch((error) => {
                    console.log("Nodemailer error ----------------", error);
                });
        });
    };
    /* End send email */


    BssStudentsModel.update(student_details, { where: { student_uuid }, returning: true, plain: true }).then(async (response) => {

        const BssStudentAllergyModel = await BssStudentAllergy(config_sequelize);
        // const student_id = response[1][0].student_id;
        //destroy all allergy data if allergy status is false
        if (student_details.student_allergy_status === "no") {
            try {

                BssStudentAllergyModel.destroy({ where: { student_id } })

            } catch (error) {

                console.log("Destroy student allergy details error")
                res.json({
                    status: 400,
                    success: false,
                    error: error.message,
                    message: "Something went wrong. Please try again or reach out to support if the issue persists."

                });
            };
        };
        if (student_details.student_allergy_status === "yes") {

            let allergy_data;
            allergy_data = JSON.parse(student_details.allergy_data);
            //for testing on postman
            // allergy_data = student_details.allergy_data



            try {
                if (allergy_data) {
                    allergy_data.forEach(async (allergyValue, allergyIndex) => {

                        if (allergyValue.student_allergy_uuid) {

                            const student_allergy_uuid = allergy_data[allergyIndex].student_allergy_uuid;
                            allergy_data[allergyIndex].updated_by = login_user.user_id;
                            delete allergy_data[allergyIndex].student_allergy_uuid;
                            //encrypt values
                            allergy_data[allergyIndex].allergy_name = Sq.fn("PGP_SYM_ENCRYPT ", allergy_data[allergyIndex].allergy_name, PG_ENCRYPT_KEY);
                            allergy_data[allergyIndex].allergy_info = Sq.fn("PGP_SYM_ENCRYPT ", allergy_data[allergyIndex].allergy_info, PG_ENCRYPT_KEY);
                            await BssStudentAllergyModel.update(allergy_data[allergyIndex], {
                                where: {
                                    student_allergy_uuid: student_allergy_uuid,
                                },
                            });
                        }
                        else {

                            delete allergy_data[allergyIndex].student_allergy_uuid;
                            allergy_data[allergyIndex].student_id = student_id;
                            //encrypt vlaues
                            allergy_data[allergyIndex].allergy_name = Sq.fn("PGP_SYM_ENCRYPT ", allergy_data[allergyIndex].allergy_name, PG_ENCRYPT_KEY);
                            allergy_data[allergyIndex].allergy_info = Sq.fn("PGP_SYM_ENCRYPT ", allergy_data[allergyIndex].allergy_info, PG_ENCRYPT_KEY);
                            await BssStudentAllergyModel.create(allergy_data[allergyIndex]);
                        }
                    });
                };
            } catch (error) {
                console.log(error);

                return res.json({
                    status: 400,
                    success: false,
                    error: error.message,
                    message: "Something went wrong. Please try again or reach out to support if the issue persists."

                });
            };
        };
        // send logs into database
        const sys_obj = {
            user_id: login_user.user_id,
            action: "updated",
            html_info: `<strong>${response[1].student_first_name} ${response[1].student_last_name}</strong> student information is updated by <strong>${login_user.first_name} ${login_user.last_name}</strong> `
        }
        await SystemLogsFun(sys_obj, config_sequelize);

        res.json({
            status: 200,
            success: true,
            message: "Student details Updated successfully!"
        });
    }).catch((error) => {

        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error.message,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."

        });
    });

};

module.exports.DeleteStudentAllergyById = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const { student_allergy_uuid } = req.body;

    const BssStudentAllergyModel = await BssStudentAllergy(config_sequelize);
    BssStudentAllergyModel.destroy({ where: { student_allergy_uuid } }).then((response) => {
        res.json({
            status: 200,
            success: true,
            message: "Allergy Deleted successfully!"
        })

    }).catch((error) => {

        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })
    })

};

module.exports.UpdateStudentStatus = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const { student_uuid, is_student_activate } = req.body;

    const BssStudentsModel = await BssStudents(await config_sequelize);
    BssStudentsModel.update({ is_student_activate, updated_by: login_user.user_id }, { where: { student_uuid }, hooks: false })
        .then((reponse) => {
            res.json({
                status: 200,
                success: true,
                message: `Students ${is_student_activate === true || is_student_activate === "true" ? "Activated" : "Deactivated"} Successfully!`
            })

        }).catch((error) => {
            console.log(error);
            res.json({
                status: 400,
                success: false,
                error: error,
                message: "Something went wrong. Please try again or reach out to support if the issue persists."
            })
        })

};
module.exports.GetParentDetailsByParentEmail = async (req, res) => {

    const config_sequelize = req.config_sequelize;
    const { father_email, mother_email } = req.query;
    const BssParentsModel = await BssParents(config_sequelize);
    const BssParentAddressModel = await BssParentAddress(config_sequelize)
    BssParentsModel.findOne({
        where: {
            [Sq.Op.or]:
                [Sq.where(Sq.fn('PGP_SYM_DECRYPT', Sq.col('father_email'), PG_ENCRYPT_KEY
                ), "LIKE", father_email),
                Sq.where(Sq.fn('PGP_SYM_DECRYPT', Sq.col('mother_email'), PG_ENCRYPT_KEY
                ), "LIKE", mother_email)
                ]
        }, attributes: {
            exclude: ["created_date", "created_by", "updated_by", "deleted_by", "updated_date", "deleted_date"]
        },
        include: {
            model: BssParentAddressModel, as: "parent_address",
            attributes: {
                exclude: ["created_date", "created_by", "updated_by", "deleted_by", "updated_date", "deleted_date"]
            },
        }
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Parents details successfully!"
        })

    }).catch((error) => {
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })
    })
};

module.exports.GetStudentHostByHostEmail = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const { host_email, host_contact } = req.query;

    const BssHostModel = await BssHost(config_sequelize);
    BssHostModel.findOne({
        where: {
            [Sq.Op.or]:
                [Sq.where(Sq.fn('PGP_SYM_DECRYPT', Sq.col('host_email'), PG_ENCRYPT_KEY
                ), "LIKE", host_email),
                Sq.where(Sq.fn('PGP_SYM_DECRYPT', Sq.col('host_contact'), PG_ENCRYPT_KEY
                ), "LIKE", host_contact)
                ]
        },
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Host details by Email successfully!"
        })

    }).catch((error) => {
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })
    })

};

module.exports.AddOrUpdateStudentHost = async (req, res) => {
    const login_user = req.login_user;
    const config_sequelize = req.config_sequelize;
    let host_details = req.body;

    const BssHostModel = await BssHost(config_sequelize);
    const BssStudentHostModel = await BssStudentHost(config_sequelize);
    console.log("-------------------host data---------------", host_details)
    let host_data = host_details.host_data;
    // host_data = JSON.parse(host_data);
    if (host_data.length > 0) {
        try {
            host_data.forEach(async (hostValue, hostIndex) => {

                if (hostValue.host_id) {

                    const host_id = host_data[hostIndex].host_id;
                    host_data[hostIndex].updated_by = login_user.user_id;
                    delete host_data[hostIndex].host_uuid;
                    delete host_data[hostIndex].host_id;
                    //encrypt values
                    host_data[hostIndex].host_email = Sq.fn("PGP_SYM_ENCRYPT ", host_data[hostIndex].host_email, PG_ENCRYPT_KEY);
                    host_data[hostIndex].host_address = Sq.fn("PGP_SYM_ENCRYPT ", host_data[hostIndex].host_address, PG_ENCRYPT_KEY);
                    host_data[hostIndex].host_contact = Sq.fn("PGP_SYM_ENCRYPT ", host_data[hostIndex].host_contact, PG_ENCRYPT_KEY);

                    await BssHostModel.update(host_data[hostIndex], {
                        where: {
                            host_id: host_id,
                        },
                    });
                    await BssStudentHostModel.update(
                        {
                            student_id: host_details.student_id, host_id: host_id,
                            is_host_approved: host_data[hostIndex].is_host_approved,
                            student_host_comment: host_data[hostIndex].student_host_comment,
                            host_relation: host_data[hostIndex].host_relation,
                        },
                        {
                            where: { student_id: host_details.student_id, host_id: host_id },
                        });
                }
                else {

                    delete host_data[hostIndex].host_id;
                    let hostRes = await BssHostModel.create(host_data[hostIndex]);
                    await BssStudentHostModel.create({
                        student_id: host_details.student_id,
                        host_id: hostRes.host_id,
                        is_host_approved: host_data[hostIndex].is_host_approved,
                        host_relation: host_data[hostIndex].host_relation
                    });
                };
            });
            return res.json({
                status: 200,
                success: true,
                message: "Student Host updated successfully!"
            });

        } catch (error) {
            return res.json({
                status: 400,
                success: false,
                error: error,
                message: "Something went wrong. Please try again or reach out to support if the issue persists."
            });
        };
    }
    else {
        return res.json({
            status: 400,
            success: false,
            message: "Bad Request"
        });
    };
};


module.exports.AddStudentNewAllergyDetails = async (req, res) => {
    const allergy_details = req.body;
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user

    let allergy_data;
    // allergy_data = JSON.parse(allergy_details.allergy_data);
    allergy_data = allergy_details.allergy_data;

    //for testing on postman
    // allergy_data = allergy_details.allergy_data
    const BssStudentAllergyModel = await BssStudentAllergy(config_sequelize);

    let allergy_name = []
    allergy_data.forEach((allergyValues, allergyIndex) => {
        allergy_name.push(allergyValues.allergy_name)
        allergy_data[allergyIndex].allergy_name = Sq.fn("PGP_SYM_ENCRYPT ", allergy_data[allergyIndex].allergy_name, PG_ENCRYPT_KEY);
        allergy_data[allergyIndex].allergy_info = Sq.fn("PGP_SYM_ENCRYPT ", allergy_data[allergyIndex].allergy_info, PG_ENCRYPT_KEY);
        allergy_data[allergyIndex].allergy_note = Sq.fn("PGP_SYM_ENCRYPT ", allergy_data[allergyIndex].allergy_note, PG_ENCRYPT_KEY);

    })


    await BssStudentAllergyModel.bulkCreate(allergy_data).then(async (response) => {
        const BssStudentsModel = await BssStudents(config_sequelize);
        //update the student allergy status
        if (response) {
            let student_allergy_status = Sq.fn("PGP_SYM_ENCRYPT ", "yes", PG_ENCRYPT_KEY);
            BssStudentsModel.update({ student_allergy_status }, { where: { student_id: response[0].student_id } })

            const student = await BssStudentsModel.findOne({ where: response.student_id })
            for (allergy of allergy_name) {
                const sys_obj = {
                    user_id: login_user.user_id,
                    action: "created",
                    html_info: `${login_user.first_name} ${login_user.last_name} enrolled a <strong> ${student.student_first_name} ${student.student_last_name} </strong> with allergy name [${allergy}]  allergic in the boarding system`
                }

                SystemLogsFun(sys_obj, config_sequelize)
            }



        }

        return res.json({
            status: 200,
            success: true,
            message: "Allergy details created successfully!"
        })

    }).catch((error) => {
        console.log(error);
        return res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })

    })

}

//need to update the api 
module.exports.GetAllAllergicStudentsDetail = async (req, res) => {
    const { page, limit, order, sort, search, is_student_activate } = req.query;
    const config_sequelize = req.config_sequelize;
    let where_data = {
        student_allergy_status: Sq.where(Sq.fn('PGP_SYM_DECRYPT', Sq.col('student_allergy_status'),
            PG_ENCRYPT_KEY), "LIKE", "yes")
    };
    let query_data = {};
    if (search) {
        where_data = {
            ...where_data,
            [Sq.Op.or]: [
                //check the first name or last name with case insensitivity
                Sq.where(Sq.fn("concat", Sq.col("student_first_name"), " ", Sq.col("student_last_name")),
                    { [Sq.Op.iLike]: `%${search}%` }),
            ],
        };
    }

    if (is_student_activate === true || is_student_activate === "true") {
        where_data = {
            ...where_data,
            is_student_activate: true
        }
    }

    if (is_student_activate === false || is_student_activate === "false") {
        where_data = {
            ...where_data,
            is_student_activate: false
        }
    }

    if (page && limit) {
        query_data.offset = 0 + (page - 1) * limit;
        query_data.limit = limit;
    }
    if (order && sort) {


        query_data.order = [[sort, order]]
    }
    console.log(query_data)

    const BssStudentsModel = await BssStudents(config_sequelize);
    const BssStudentAllergyModel = await BssStudentAllergy(config_sequelize);

    BssStudentsModel.findAndCountAll({
        where: where_data, ...query_data,
        distinct: true,
        attributes: [
            "student_uuid", "student_id", "student_first_name", "student_last_name",
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('student_allergy_status'), PG_ENCRYPT_KEY), "student_allergy_status"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('unique_pin'), PG_ENCRYPT_KEY), "unique_pin"]

        ],
        include:
        {
            model: BssStudentAllergyModel, as: "allergy_details",
            separate: true,
            attributes:
            {
                include: [
                    [Sq.fn('PGP_SYM_DECRYPT', Sq.col('allergy_name'), PG_ENCRYPT_KEY), "allergy_name"],
                    [Sq.fn('PGP_SYM_DECRYPT', Sq.col('allergy_info'), PG_ENCRYPT_KEY), "allergy_info"],
                ],
                exclude: ["created_by", "allergy_note", "updated_by", "deleted_by", "created_date", "updated_date", "deleted_date"]
            },
        },

        hooks: false
    }).then((response) => {

        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get all Allergic Students details successfully!"
        })
    }).catch((error) => {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })
    })

}

module.exports.GetAllergicStudentDetailById = async (req, res) => {

    const config_sequelize = req.config_sequelize;
    const { student_uuid } = req.query;
    const BssStudentsModel = await BssStudents(config_sequelize);
    const BssStudentAllergyModel = await BssStudentAllergy(config_sequelize);

    BssStudentsModel.findOne({
        where: { student_uuid },
        attributes: {

            include: [[Sq.fn('PGP_SYM_DECRYPT', Sq.col('student_allergy_status'), PG_ENCRYPT_KEY), "student_allergy_status"]],
            exclude: ["student_email", "gender", "unique_pin", "campus_name", "sporting_house", "laundry_number", "tutor_name", "tutor_email"
                , "date_of_birth", "kiosk_mode_pin", "allergy_unauth_access"]

        },
        include: {
            model: BssStudentAllergyModel, as: "allergy_details", attributes:
            {
                include: [[Sq.fn('PGP_SYM_DECRYPT', Sq.col('allergy_name'), PG_ENCRYPT_KEY), "allergy_name"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('allergy_info'), PG_ENCRYPT_KEY), "allergy_info"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('allergy_note'), PG_ENCRYPT_KEY), "allergy_note"]

                ],
                exclude: ["created_by", "updated_by", "deleted_by", "created_date", "updated_date", "deleted_date"]
            }
        },
        hooks: false
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Allergic Student details successfully!"
        })

    }).catch((error) => {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })
    })

}

module.exports.AddOrUpdateStudentAllergyDetails = async (req, res) => {
    const login_user = req.login_user;
    const config_sequelize = req.config_sequelize;
    let allergy_details = req.body;

    const BssStudentAllergyModel = await BssStudentAllergy(config_sequelize);
    const BssStudentsModel = await BssStudents(config_sequelize)

    let update_allergy_data;
    // update_allergy_data = JSON.parse(allergy_details?.update_allergy_data);
    update_allergy_data = allergy_details?.update_allergy_data;

    let allergy_data;
    // allergy_data = JSON.parse(allergy_details.allergy_data);
    allergy_data = allergy_details?.allergy_data
    if (update_allergy_data && update_allergy_data.length > 0 || allergy_data && allergy_data.length > 0) {

        try {
            if (update_allergy_data && update_allergy_data.length > 0) {


                update_allergy_data.forEach(async (allergyValue, allergyIndex) => {
                    const student_allergy_uuid = update_allergy_data[allergyIndex].student_allergy_uuid;
                    update_allergy_data[allergyIndex].updated_by = login_user.user_id;
                    delete update_allergy_data[allergyIndex].student_allergy_uuid;
                    //encrypt values
                    update_allergy_data[allergyIndex].allergy_name = Sq.fn("PGP_SYM_ENCRYPT ", update_allergy_data[allergyIndex].allergy_name, PG_ENCRYPT_KEY);
                    update_allergy_data[allergyIndex].allergy_info = Sq.fn("PGP_SYM_ENCRYPT ", update_allergy_data[allergyIndex]?.allergy_info ? update_allergy_data[allergyIndex].allergy_info : "", PG_ENCRYPT_KEY);
                    update_allergy_data[allergyIndex].allergy_note = Sq.fn("PGP_SYM_ENCRYPT ", update_allergy_data[allergyIndex]?.allergy_note ? update_allergy_data[allergyIndex].allergy_note : "", PG_ENCRYPT_KEY);
                    let student_ids = []
                    const response = await BssStudentAllergyModel.update(update_allergy_data[allergyIndex], {
                        where: {
                            student_allergy_uuid: student_allergy_uuid,
                        }, returning: true, plain: true
                    });

                    student_ids.push(response[1].student_id)

                    const student = await BssStudentsModel.findAll({ where: { student_id: { [Sq.Op.in]: student_ids } } })

                    student.forEach(async (value, index) => {
                        const sys_obj = {
                            user_id: login_user.user_id,
                            action: "updated",
                            html_info: `${login_user.first_name} ${login_user.last_name} update ${value.student_first_name} ${value.student_last_name} with   allergic  information in the boarding system`
                        }
                        SystemLogsFun(sys_obj, config_sequelize)
                    })

                });
            }
        } catch (error) {
            console.log(error);
            return res.json({
                status: 400,
                success: false,
                error: error,
                message: "Something went wrong. Please try again or reach out to support if the issue persists."
            })
        }
        if (allergy_data && allergy_data.length > 0) {

            allergy_data.forEach((allergyValues, allergyIndex) => {
                //encrypt values
                allergy_data[allergyIndex].allergy_name = Sq.fn("PGP_SYM_ENCRYPT ", allergy_data[allergyIndex].allergy_name, PG_ENCRYPT_KEY);
                allergy_data[allergyIndex].allergy_info = Sq.fn("PGP_SYM_ENCRYPT ", allergy_data[allergyIndex]?.allergy_info ? allergy_data[allergyIndex].allergy_info : "", PG_ENCRYPT_KEY);
                allergy_data[allergyIndex].allergy_note = Sq.fn("PGP_SYM_ENCRYPT ", allergy_data[allergyIndex]?.allergy_note ? allergy_data[allergyIndex].allergy_note : "", PG_ENCRYPT_KEY);
                allergy_data[allergyIndex].created_by = login_user.user_id;

            })

            await BssStudentAllergyModel.bulkCreate(allergy_data).then((response) => {

                response.forEach(async (value, index) => {

                    const student = await BssStudentsModel.findOne({ where: { student_id: value.student_id } })

                    const sys_obj = {
                        user_id: login_user.user_id,
                        action: "update",
                        html_info: `${login_user.first_name} ${login_user.last_name} create ${student.student_first_name} ${student.student_last_name} with an  allergic in the boarding system`
                    }
                    SystemLogsFun(sys_obj, config_sequelize)
                })


            }).catch((error) => {
                console.log(error);
                return res.json({
                    status: 400,
                    success: false,
                    error: error,
                    message: "Something went wrong. Please try again or reach out to support if the issue persists."
                })

            })
        }
        return res.json({
            status: 200,
            success: true,
            message: "Allergy details updated successfully!"
        })

    } else {
        return res.json({
            status: 400,
            success: false,
            message: "Bad Request!"
        })
    }

}

module.exports.RemoveAllAllergyOfStudent = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;
        const login_user = req.login_user;
        const { student_id } = req.body;

        const BssStudentsModel = await BssStudents(config_sequelize)
        const BssStudentAllergyModel = await BssStudentAllergy(await config_sequelize);

        const response = await BssStudentsModel.update({
            student_allergy_status: Sq.fn("PGP_SYM_ENCRYPT ", "no", PG_ENCRYPT_KEY), updated_by: login_user.user_id
        }, { where: { student_id }, individualHooks: false, returning: true, plain: true });

        await BssStudentAllergyModel.destroy({ where: { student_id } });
        let sys_obj = {
            user_id: login_user.user_id,
            action: "deleted",
            html_info: `${login_user.first_name} ${login_user.last_name} deleted the ${response[1].student_first_name} ${response[1].student_last_name} allergy information. `
        }
        SystemLogsFun(sys_obj, config_sequelize)

        res.json({
            status: 200,
            success: true,
            message: `Allegic Student Removed Successfully!`
        });
    } catch (error) {
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });
    };

};


module.exports.GetAllNonAllergicStudentsList = async (req, res) => {
    const config_sequelize = req.config_sequelize;

    const { gender, dormitory_id, class_id, is_student_activate, student_age } = req.query;

    let where_data = {
        student_allergy_status: Sq.where(Sq.fn('PGP_SYM_DECRYPT', Sq.col('student_allergy_status'),
            PG_ENCRYPT_KEY), "LIKE", "no")
    };
    if (gender) {
        where_data = {
            ...where_data,
            gender: gender
        }
    };
    if (dormitory_id) {
        where_data = {
            ...where_data,
            dormitory_id: dormitory_id
        }

    };
    if (is_student_activate === "true" || is_student_activate === true) {
        where_data = {
            ...where_data,
            is_student_activate: true
        }

    };
    if (is_student_activate === "false" || is_student_activate === false) {
        where_data = {
            ...where_data,
            is_student_activate: false
        }
    };
    if (class_id) {
        where_data = {
            ...where_data,
            class_id: class_id
        }

    };
    if (student_age) {
        where_data = {
            ...where_data,
            student_age: student_age
        }
    }

    const BssStudentsModel = await BssStudents(config_sequelize);
    BssStudentsModel.findAll({ where: where_data, order: [["student_first_name", "asc"]] }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get all Non allergic Students details successfully!"
        })

    }).catch((error) => {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."

        })
    })

};
module.exports.GenerateAllergicStudentsReport = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;
        const login_user = req.login_user;
        const school_code = req.headers.school_code;
        const { dormitory_id, class_id, student_id, search, gender } = req.body

        let where_data = {};

        if (dormitory_id) {
            where_data = {
                ...where_data,
                dormitory_id: dormitory_id
            };
        };
        if (class_id) {
            where_data = {
                ...where_data,
                class_id: class_id
            };
        };
        if (student_id) {
            where_data = {
                ...where_data,
                student_id: student_id
            };
        };
        if (gender) {
            where_data = {
                ...where_data,
                gender: gender
            };
        };
        if (search) {
            where_data = {
                ...where_data,
                [Sq.Op.or]: [
                    Sq.where(Sq.col("student_first_name"), { [Sq.Op.like]: `%${search}%` }),
                    Sq.where(Sq.col("student_last_name"), { [Sq.Op.like]: `%${search}%` })
                ]
            };
        };
        const BssStudentModel = await BssStudents(config_sequelize);
        const BssStudentAllergyModel = await BssStudentAllergy(config_sequelize);
        const BssDormitoriesModel = await BssDormitories(config_sequelize);
        const BssClassModel = await BssClasses(config_sequelize);

        BssStudentModel.hasOne(await BssClassModel, {
            as: "class_details",
            foreignKey: "class_id",
            sourceKey: "class_id",
        });

        const response = await BssStudentModel.findAll({
            where: {
                ...where_data,
                student_allergy_status: Sq.where(
                    Sq.fn("PGP_SYM_DECRYPT", Sq.col("student_allergy_status"), PG_ENCRYPT_KEY),
                    "LIKE",
                    "yes"
                ),
            },
            attributes: [
                [Sq.fn("concat", Sq.col("student_first_name"), " ", Sq.col("student_last_name")), "student_name"],
                [Sq.fn("PGP_SYM_DECRYPT", Sq.col("unique_pin"), PG_ENCRYPT_KEY), "unique_pin"], "gender",
                "student_first_name",
                "student_last_name",
            ],
            include: [
                {
                    model: BssClassModel,
                    as: "class_details",
                    attributes: ["class_name"],
                },
                {
                    model: BssDormitoriesModel,
                    as: "dormitory_data",
                    attributes: [
                        [Sq.fn("PGP_SYM_DECRYPT", Sq.col("dormitory_name"), PG_ENCRYPT_KEY), "dormitory_name"],
                    ],
                },
                {
                    model: BssStudentAllergyModel,
                    as: "allergy_details",
                    attributes: [
                        [Sq.fn("PGP_SYM_DECRYPT", Sq.col("allergy_name"), PG_ENCRYPT_KEY), "allergy_name"],
                        [Sq.fn("PGP_SYM_DECRYPT", Sq.col("allergy_info"), PG_ENCRYPT_KEY), "allergy_info"],
                        [Sq.fn("PGP_SYM_DECRYPT", Sq.col("allergy_note"), PG_ENCRYPT_KEY), "allergy_note"],
                    ],
                },
            ],
        });

        if (response.length > 0) {

            const todayDate = DateTime.now().toFormat("dd-MM-yyyy");
            const file_name = `ExportAllergyDetailsPdf-${new Date().getTime()}.pdf`;
            const uploadFilePath = `uploads/${school_code}/${file_name}`;
            const createPdfFile = fs.createWriteStream(uploadFilePath);

            const doc = new PDFDocument({ margin: 24, size: "A4" });
            doc.pipe(createPdfFile);
            let table_title = {
                headers: [
                    { label: `Date:- ${todayDate}`, width: 123, headerColor: "white" },
                    { label: "Allergy Details", fontSize: 25, align: "center", width: 400, headerColor: "white" }
                ],
            };
            doc.table(table_title,
                {
                    prepareHeader: () => doc.font("Helvetica-Bold").fontSize(11),
                    padding: 4,
                });
            let subtitle = "";
            if (req.body) {
                if (dormitory_id) {
                    subtitle = `Allergy Students of ${response[0].dormitory_data.dormitory_name}`

                }
                if (class_id) {
                    subtitle = `Allergy Students of ${response[0].class_details.class_name} class`
                }
            };

            let datas = [];
            response.forEach(async (student) => {
                student.allergy_details.forEach((allergy) => {
                    if (allergy.allergy_note.length > 50) {
                        allergy.allergy_note = allergy.allergy_note.substring(0, 100) + '........'
                    }
                    datas.push({
                        student_name: `${student.student_first_name} ${student.student_last_name}`,
                        class_name: student.class_details.class_name,
                        roll_no: student.unique_pin,
                        gender: student.gender,
                        dormitory_name: student.dormitory_data ? student.dormitory_data.dormitory_name : "",
                        allergy_name: allergy.allergy_name,
                        allergy_info: allergy.allergy_info,
                        allergy_note: allergy.allergy_note,
                    });
                });
            });
            const table = {
                subtitle: subtitle ? subtitle : "All allergic student details",
                headers: [
                    { label: "Student Name", property: "student_name", width: 100 },
                    { label: "Class", property: "class_name", width: 45 },
                    { label: "Gender", property: "gender", width: 55 },
                    { label: "Allergy Name", property: "allergy_name", width: 100 },
                    { label: "Allergy Info", property: "allergy_info", width: 100 },
                    { label: "Allergy Note", property: "allergy_note", width: 150 },
                ],
                datas: [...datas],
                rows: []
            };

            doc.table(table, {
                prepareHeader: () => doc.font("Helvetica-Bold").fontSize(12),
                prepareRow: () => doc.font("Helvetica").fontSize(9),
                padding: 3,
            });
            if (doc.y > 0.8 * doc.page.height) {
                doc.addPage()
            };

            doc.moveDown(); // move to down // separate tables
            doc.end();

            res.json({
                status: 200,
                success: true,
                file: process.env.APP_URL + "/" + uploadFilePath,
                message: "PDF successfully generated ",
            });
        } else {
            console.log(error);
            res.json({
                status: 400,
                success: false,
                error: error,
                message: "Allergy data not found!",
            });
        };
    }
    catch (error) {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "something went wrong please try again or reach out to support if the issue persists",
        });

    };
};

module.exports.GetReturnStudentDetails = async (req, res) => {
    try {
        const { config_sequelize, query } = req;
        let { search, page, limit, order, sort, from_date, to_date, class_ids, dormitory_ids } = query;

        const BssBorderLeavesModel = await BssBorderLeaves(config_sequelize);
        const BssStudentsModel = await BssStudents(config_sequelize);
        const BssHostModel = await BssHost(config_sequelize);
        const BssParentsModel = await BssParents(config_sequelize);
        const BssTravelModel = await BssTravelMode(config_sequelize);
        const BssBorderLeaveReturnStuModel =await BssBorderLeaveReturnStu(config_sequelize)

        // Get the current date and time
        // const currentDate = DateTime.local();
        // // Format the current date as a string in a specific format
        // const formattedDate = currentDate.toFormat('yyyy-MM-dd HH:mm:ss');
        let where_data = {is_leave_archived: false,depart_status:departed};
        /* Pagination */
        const offset = page && limit ? (page - 1) * limit : 0;
        const limitPerPage = page && limit ? limit : 10;

        /* Sorting */
        const orderCriteria = sort && order ? [[sort, order]] : [];

        let date_query = {};

        if (from_date && to_date) {
            where_data = {
                ...where_data,
                [Op.or]: [
                    {
                        planned_return_date: {
                            [Op.and]:[
                                { [Op.gte]: from_date },
                                { [Op.lte]: to_date }
                            ]
                        }
                    },
                    {
                        return_date: {
                            [Op.and]: [
                                { [Op.gte]: from_date},
                                { [Op.lte]: to_date }
                            ]
                        }
                    }
                ]
            };
        }
         else if (from_date) {
            where_data = {
                ...where_data,
                [Sq.Op.or]: [
                    { planned_return_date: { [Op.gte]: from_date } },
                    { return_date: { [Op.gte]: from_date } }
                ]
            };
        } else if (to_date) {
            where_data = {
                ...where_data,
                [Sq.Op.or]: [
                    { planned_return_date: { [Op.lte]: to_date } },
                    { return_date: { [Op.lte]: to_date } }
                ]
            };
        }

        if (search) {
            where_data[Op.or] = [
                where(Sq.col('leave_stu_data.student_first_name'), { [Op.iLike]: `%${search}%` }),
                where(Sq.col('leave_stu_data.student_last_name'), { [Op.iLike]: `%${search}%` }),
                where(Sq.col('return_mode_data.travel_mode_name'), { [Op.iLike]: `%${search}%` }),
                where(Sq.col('return_mode_data.travel_mode_name'), { [Op.iLike]: `%${search}%` }),
                where(Sq.col('return_students_data.palnned_return_time'), { [Op.iLike]: `%${search}%` }),
            ];
        }

        const response = await BssBorderLeavesModel.findAndCountAll({
            where:where_data,
                attributes:["border_leave_id","student_id", "return_date","return_time","created_date","is_user_approval",],
            include: [
                {
                    model: BssStudentsModel,
                    as: 'leave_stu_data',
                    attributes: [
                        [fn("concat", col("student_first_name"), " ", col("student_last_name")), "student_name"],
                        [fn('PGP_SYM_DECRYPT', col('leave_stu_data.student_email'), PG_ENCRYPT_KEY), "student_email"],
                        [fn('PGP_SYM_DECRYPT', col('leave_stu_data.unique_pin'), PG_ENCRYPT_KEY), "unique_pin"]
                    ],
                },
                {
                    model: BssHostModel,
                    as: 'stu_host_data',
                    attributes: [
                        "host_name"
                    ]
                },
                {
                    model: BssParentsModel,
                    as: 'parent_data',
                    attributes: [
                        "father_name", "mother_name"
                    ]
                },
                {
                    model: BssTravelModel,
                    as: 'return_mode_data',
                    attributes: [
                        "travel_mode_name"
                    ],
                },
                {
                    model:BssBorderLeaveReturnStuModel,as:'return_students_data',
                    include:
                        {
                            model: BssTravelModel,
                            as: 'planned_return_mode',
                            attributes: [
                                "travel_mode_name"
                            ],
                        },
                       
                    }
            ],
            distinct: true,
            offset,
            limit: limitPerPage,
            order: orderCriteria
        });

        res.status(200).json({
            success: true,
            data: response,
            // user_approval_counts,
            message: "Get All Leave Details successfully!"
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            error: error,
            message: "Something went wrong. Please try again or contact support if the issue persists."
        });
    }
};



//Student Generic  
module.exports.GetAllStudentsList = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user =req.login_user
    console.log("::::::::::::",login_user)
    const { gender, dormitory_id, class_id, is_student_activate, student_age } = req.query;

    let where_data = {};

    if (gender) {
        where_data = {
            ...where_data,
            gender: gender
        }
    };
    if (dormitory_id) {
        where_data = {
            ...where_data,
            dormitory_id: dormitory_id
        }

    };
    if (is_student_activate === "true" || is_student_activate === true) {
        where_data = {
            ...where_data,
            is_student_activate: true
        }

    };
    if (is_student_activate === "false" || is_student_activate === false) {
        where_data = {
            ...where_data,
            is_student_activate: false
        }
    };
    if (class_id) {
        where_data = {
            ...where_data,
            class_id: class_id
        }

    };

    if (student_age) {
        where_data = {
            ...where_data,
            student_age: student_age
        }
    }


//    let a =[
//     {
//     product_id:1,
//     coustmor_id:2,
//     amount:300
//    },  {
//     product_id:2,
//     coustmor_id:3,
//     amount:700

//    }
// ]

// a.findAll().then((response)=>{
//     console.log(response)
// })



// const planned_return_date = "2023-10-27"
// const planned_return_time ="12:00"
// // const plannedReturnDate = DateTime.fromISO(planned_return_date);
// const plannedReturnDateTime = DateTime.fromFormat(
//     `${planned_return_date}T${planned_return_time}`,
//     "yyyy-MM-dd'T'HH:mm"
//   );
  

// // console.log(":::::::;;;;",plannedReturnDateTime)
// const currentDate = DateTime.now();

// // Calculate the total duration
// const duration = currentDate.diff(plannedReturnDateTime);

// // Calculate the delay components
// const days = duration.as('days');
// const hours = duration.as('hours') % 24;
// const minutes = duration.as('minutes') % 60;
// const seconds = duration.as('seconds') % 60;

// console.log("duration:::::::::::::::",(duration.as('hours')))
// // Format the delay as a string
// const formattedDelay = `${Math.floor(days)} days ${Math.floor(hours)} hrs ${Math.floor(minutes)} mins ${Math.floor(seconds)} sec`;

// console.log("Delay:", formattedDelay);
// Given values
const listPrice = 60; // List price in Rs.
const taxPercentage = 2; // Tax percentage
const returnPercentage = 3; // Return percentage

// Calculate the selling price
const taxAmount = (listPrice * taxPercentage) / 100; // Calculate the tax amount
const returnAmount = (listPrice * returnPercentage) / 100; // Calculate the return amount

// Calculate the selling price
const sellingPrice = listPrice + taxAmount - returnAmount;

console.log(`Selling Price: ${sellingPrice} Rs`);



    
    const BssStudentsModel = await BssStudents(config_sequelize);
    BssStudentsModel.findAll({
        where: where_data, attributes: ["parent_id","student_id", [Sq.fn('SUM', Sq.col('parent_id')), 'Sum parent_id'],[Sq.fn('count', Sq.col('student_id')), 'Sum student_id']], 
            // order: [["student_first_name", "asc"],
         
                // [
                //     Sq.fn('COUNT', literal(`CASE WHEN parent_id = '38' THEN 1 ELSE NULL END`)),
                //     'total_approved'
                // ],
            // ], 
            group: ['parent_id',"student_id"],
        // hooks: false
    })
        .then((response) => {
            res.json({
                status: 200,
                success: true,
                data: response,
                message: "Get all Students List successfully!"
            })

        }).catch((error) => {
            console.log(error);
            res.json({
                status: 400,
                success: false,
                error: error,
                message: "Something went wrong. Please try again or reach out to support if the issue persists."

            })
        })

}


module.exports.CreateStudentGeneric = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const student_generic_details = req.body;
    student_generic_details.created_by = login_user.user_id;

    // console.log(student_generic_details)
    const BssStudentGenericModel = await BssStudentGeneric(await config_sequelize);
    const BssStudentModel = await BssStudents(config_sequelize)

    await BssStudentGenericModel.create(student_generic_details).then(async (response) => {
        const stuResponse = await BssStudentModel.findOne({ where: { student_id: response.student_id } })

        let sys_obj = {
            login_user: login_user.user_id,
            action: "created",
            html_info: `${login_user.first_name} ${login_user.last_name} enrolled ${stuResponse.student_first_name} ${stuResponse.student_last_name} with an generic comment[${response.generic_desc}] from ${response.generic_start_date}& ${response.generic_start_date} on boarding system`
        }
        SystemLogsFun(sys_obj, config_sequelize)

        res.json({
            status: 200,
            success: true,
            message: "Generic Comment created  successfully!"
        })

    }).catch((error) => {
        console.log(error)
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })

    })

}

module.exports.GetAllStudentsGeneric = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const { page, limit, sort, order, search, is_generic_activate, } = req.query;

    const BssStudentGenericModel = await BssStudentGeneric(config_sequelize);
    const BssStudentsModel = await BssStudents(config_sequelize);

    let where_data = {};
    let query_data = {};
    let include_where_data = {};

    if (is_generic_activate === "true" || is_generic_activate === true) {
        {
            where_data.is_generic_activate = true
        };
    }

    if (is_generic_activate === "false" || is_generic_activate === false) {

        where_data.is_generic_activate = false
    };

    if (search) {
        include_where_data = {
            ...include_where_data,
            [Sq.Op.or]: [
                //check the first name or last name with case insensitivity
                Sq.where(Sq.fn("concat", Sq.col("student_first_name"), " ", Sq.col("student_last_name")), { [Sq.Op.iLike]: `%${search}%` }),
            ],
        }
    };

    if (page && limit) {
        query_data.offset = 0 + (page - 1) * limit;
        query_data.limit = limit

    }
    if (sort && order) {
        //order query for sort data by associate table
        query_data.order = [[{ model: BssStudentsModel, as: "generic_student" }, sort, order]];

    }

    //Make relation here
    BssStudentGenericModel.hasOne(await BssStudentsModel, {
        as: "generic_student", sourceKey: "student_id", foreignKey: "student_id",
        constraints: false, allowNull: true, defaultValue: null

    })

    BssStudentGenericModel.findAndCountAll({
        where: where_data,
        ...query_data,

        attributes:
            { exclude: ["created_date", "created_by", "deleted_by", "deleted_date", "updated_date", "updated_by"] },
        include: {

            model: BssStudentsModel, where: include_where_data, as: "generic_student",
            attributes: ["student_id", "student_uuid", "student_first_name", "student_last_name",
                [Sq.fn("PGP_SYM_DECRYPT", Sq.col("unique_pin"), PG_ENCRYPT_KEY), "unique_pin"]]
            ,
        },

    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get all Students Generic Comments details successfully!"
        })

    }).catch((error) => {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."

        })
    })

}

module.exports.GetStudentGenericById = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const { student_generic_uuid } = req.query;

    const BssStudentsModel = await BssStudents(config_sequelize);
    const BssStudentGenericModel = await BssStudentGeneric(await config_sequelize);

    //Make relation here
    BssStudentGenericModel.hasOne(await BssStudentsModel, {
        as: "generic_student", sourceKey: "student_id", foreignKey: "student_id",
        constraints: false, allowNull: true, defaultValue: null

    })
    BssStudentGenericModel.findOne({
        where: { student_generic_uuid }, attributes:
        {
            exclude: ["created_date", "created_by", "deleted_by", "deleted_date",
                "updated_date", "updated_by"]
        },
        include: {
            model: BssStudentsModel, as: "generic_student",
            attributes: ["student_id", "student_uuid", "student_first_name", "student_last_name"]
        }
    })
        .then((response) => {
            res.json({
                status: 200,
                success: true,
                data: response,
                message: "Get Student Generic comment details successfully!"
            })

        }).catch((error) => {
            console.log(error);
            res.json({
                status: 400,
                success: false,
                error: error,
                message: "Something went wrong. Please try again or reach out to support if the issue persists."
            })
        })

}

module.exports.DeleteStudentGeneric = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const { student_generic_uuid, student_id } = req.body;

    //request for student id

    const BssStudentGenericModel = await BssStudentGeneric(await config_sequelize);
    const BssStudentModel = await BssStudents(config_sequelize)
    BssStudentGenericModel.destroy({ where: { student_generic_uuid }, returning: true, plain: true }).then(async (response) => {

        const stuResponse = await BssStudentModel.findOne({ where: { student_id } })
        let sys_obj = {
            login_user: login_user.user_id,
            action: "deleted",
            html_info: `${login_user.first_name} ${login_user.last_name} deleted the ${stuResponse.student_first_name} ${stuResponse.student_last_name} generic information`
        }
        SystemLogsFun(sys_obj, config_sequelize)
        res.json({
            status: 200,
            success: true,
            message: "Student Generic Comment Deleted successfully!"
        })

    }).catch((error) => {

        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })
    })

}
module.exports.UpdateStudentGenericStatus = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user
    const { student_generic_uuid, is_generic_activate } = req.body;


    const BssStudentGenericModel = await BssStudentGeneric(await config_sequelize);
    const BssStudentModel = await BssStudents(config_sequelize)

    BssStudentGenericModel.update({ is_generic_activate }, { where: { student_generic_uuid }, returning: true, plain: true }).then(async (response) => {

        const stuResponse = await BssStudentModel.findOne({ where: { student_id: response[1].student_id } })
        let sys_obj = {
            user_id: login_user.user_id,
            action: "updated",
            html_info: `${login_user.first_name} ${login_user.last_name} updated <strong> ${stuResponse.student_first_name} ${stuResponse.student_last_name} </strong> generic Status!`
        }
        SystemLogsFun(sys_obj, config_sequelize)

        res.json({
            status: 200,
            success: true,
            message: `Student Flag ${is_generic_activate === true || is_generic_activate === "true" ? "Activated" : "Deactivated"} successfully!`

        })
    }).catch((error) => {

        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })
    })
}

module.exports.UpdateStudentGeneric = async (req, res) => {
    const login_user = req.login_user;
    const config_sequelize = req.config_sequelize;
    const student_generic_details = req.body;
    const student_generic_uuid = student_generic_details.student_generic_uuid;
    delete student_generic_details.student_generic_uuid;
    student_generic_details.updated_by = login_user.user_id;

    const BssStudentGenericModel = await BssStudentGeneric(await config_sequelize);
    const BssStudentModel = await BssStudents(config_sequelize)
    BssStudentGenericModel.update(student_generic_details, { where: { student_generic_uuid }, returning: true, plain: true }).then(async (response) => {

        const stuResponse = await BssStudentModel.findOne({ where: { student_id: response[1].student_id } })
        let sys_obj = {
            user_id: login_user.user_id,
            action: "updated",
            html_info: `${login_user.first_name} ${login_user.last_name} updated <strong> ${stuResponse.student_first_name} ${stuResponse.student_last_name} </strong> generic information!`
        }
        SystemLogsFun(sys_obj, config_sequelize)

        res.json({
            status: 200,
            success: true,
            message: "Student Generic Comment Updated successfully!"
        })
    }).catch((error) => {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })
    })

}
//Student Grounded 
// module.exports.CreateStudentGrounded = async (req, res) => {
//     const config_sequelize = req.config_sequelize;
//     const school_code = req.headers.school_code;
//     const login_user = req.login_user;
//     const student_grounded_details = req.body;
//     const { grounded_start_date, grounded_end_date, student_id, grounded_desc, school_name } = student_grounded_details;
//     student_grounded_details.created_by = login_user.user_id;

//     const BssStudentGroundedModel = await BssStudentGrounded(config_sequelize);
//     const BssStudentModel = await BssStudents(config_sequelize)

//     if (await BssStudentGroundedModel.findOne({
//         where: {
//             [Sq.Op.and]:
//                 [
//                     { grounded_start_date: { [Sq.Op.lte]: moment(grounded_start_date).format("YYYY-MM-DD") } },
//                     { grounded_end_date: { [Sq.Op.gte]: moment(grounded_end_date).format("YYYY-MM-DD") } }
//                 ],
//             student_id: student_id
//         }
//     })) {
//         return res.json({
//             status: 400,
//             success: false,
//             message: "Student Has already Grounded between this Date Range!"
//         })
//     }

//     await BssStudentGroundedModel.create(student_grounded_details).then(async (response) => {

//         if (response.grounded_mail_parent === true || response.grounded_mail_student === true ||
//             response.grounded_mail_parent === "true" || response.grounded_mail_student === "true") {

//             const BssStudentModel = await BssStudents(config_sequelize);
//             const BssParentsModel = await BssParents(config_sequelize);

//             try {
//                 const studentResponse = await BssStudentModel.findOne({
//                     where: { student_id: response.student_id },
//                     attributes: ["student_uuid", "student_id", "student_first_name", "student_last_name",
//                         [Sq.fn('PGP_SYM_DECRYPT', Sq.col('student_email'), PG_ENCRYPT_KEY), "student_email"],
//                     ],
//                     include: {
//                         model: BssParentsModel, as: "parent_data",
//                         attributes: ["parent_id", "father_name", "mother_name", [Sq.fn('PGP_SYM_DECRYPT', Sq.col('father_email'), PG_ENCRYPT_KEY), "father_email"],
//                             [Sq.fn('PGP_SYM_DECRYPT', Sq.col('mother_email'), PG_ENCRYPT_KEY), "mother_email"],
//                         ]
//                     },
//                     hooks: false
//                 })
//                 //logs sava in database


//                 let sys_obj = {
//                     user_id: login_user.user_id,
//                     action: "created",
//                     html_info: `${login_user.first_name} ${login_user.last_name} enrolled <strong> ${studentResponse.student_first_name} ${studentResponse.student_last_name} </strong> with an  grounded comment[${response.grounded_desc}] from ${response.grounded_start_date} to ${response.grounded_end_date} on boarding system !`
//                 }
//                 SystemLogsFun(sys_obj, config_sequelize)

//                 /************* System Email Start for send login info **********************/
//                 let emailDetails = [];

//                 if (response.grounded_mail_student === true || response.grounded_mail_student === "true") {
//                     emailDetails.push({
//                         email_student_name: studentResponse.student_first_name + " " + studentResponse.student_last_name,
//                         email_address: studentResponse.student_email,
//                         email_parent_name: "",
//                         email_grounded_start_date: response.grounded_start_date,
//                         email_grounded_end_date: response.grounded_end_date,
//                         email_template_name: "StudentGroundedInfo.html",
//                         email_grounded_desc: response.grounded_desc,
//                         email_subject: "Student Gronded!",
//                     })
//                 }

//                 if (response.grounded_mail_parent === "true" || response.grounded_mail_parent === true) {
//                     emailDetails.push({
//                         email_parent_name: studentResponse.first_point_email === "m" ? + studentResponse.parent_data.mother_name : studentResponse.parent_data.father_name,
//                         email_address: studentResponse.first_point_email === "m" ? + studentResponse.parent_data.father_email : studentResponse.parent_data.mother_email,
//                         email_student_name: studentResponse.student_first_name + " " + studentResponse.student_last_name,
//                         email_grounded_start_date: response.grounded_start_date,
//                         email_grounded_end_date: response.grounded_end_date,
//                         email_template_name: "StudentGroundedParentInfo.html",
//                         email_grounded_desc: response.grounded_desc,
//                         email_subject: "Student Gronded!",
//                     }
//                     )
//                 }

//                 emailDetails.forEach((emailValues) => {

//                     let email_parametars = {
//                         email_student_name: emailValues.email_student_name,
//                         email_parent_name: emailValues.email_parent_name,
//                         email_address: emailValues.email_address,
//                         email_template_name: emailValues.email_template_name,
//                         email_grounded_desc: emailValues.email_grounded_desc,
//                         email_grounded_start_date: emailValues.email_grounded_start_date,
//                         email_grounded_end_date: emailValues.email_grounded_end_date,
//                         school_code: school_code,
//                         school_name: school_name,
//                         email_subject: emailValues.email_subject,
//                         APP_URL: process.env.APP_URL,

//                     };
//                     let email_template = fs.readFileSync(appRoot + `/src/Services/Views/email-templates/${emailValues.email_template_name}`, "utf8");

//                     email_template = email_template.replace(/email_student_name|email_parent_name|email_address|email_grounded_desc|email_grounded_start_date|email_grounded_end_date|school_code|school_name|APP_URL/gi, function (matched) {
//                         return email_parametars[matched];
//                     });
//                     let mailOptions = {
//                         from: process.env.MAIL_FROM_ADDRESS,
//                         to: emailValues.email_address,
//                         subject: `BSS -${emailValues.email_subject}`,
//                         html: email_template,
//                     };
//                     SendEmail(mailOptions)
//                         .then((info) => {
//                             console.log("Nodemailer Email sent-------------------", info.response);
//                         })
//                         .catch((error) => {
//                             console.log("Nodemailer error ----------------", error);
//                         });
//                 })
//                 // /***********************End System Email **********************/


//             } catch (error) {
//                 console.log(error);
//                 return res.json({
//                     status: 400,
//                     success: false,
//                     error: error,
//                     message: "Something went wrong. Please try again or reach out to support if the issue persists."
//                 })

//             }
//         }
//         res.json({
//             status: 200,
//             success: true,
//             message: "Student Grounded successfully!"
//         })

//     }).catch((error) => {
//         console.log(error);
//         res.json({
//             status: 400,
//             success: false,
//             error: error,
//             message: "Something went wrong. Please try again or reach out to support if the issue persists."

//         })
//     })
// }

module.exports.GetAllGroundedStudents = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const { page, limit, sort, order, search, is_grounded_activate } = req.query;
    let where_data = {};
    let query_data = {};
    let include_where_data = {};

    const BssStudentGroundedModel = await BssStudentGrounded(config_sequelize);
    const BssStudentsModel = await BssStudents(await config_sequelize);

    is_grounded_activate === "true" || is_grounded_activate === true ? where_data.is_grounded_activate = true : ""
    is_grounded_activate === "false" || is_grounded_activate === false ? where_data.is_grounded_activate = false : ""

    if (search) {
        include_where_data = {
            ...include_where_data,
            [Sq.Op.or]: [
                //check the first name or last name with case insensitivity
                Sq.where(Sq.fn("concat", Sq.col("student_first_name"), " ", Sq.col("student_last_name")), { [Sq.Op.iLike]: `%${search}%` }),
            ],
        }
    };

    if (page && limit) {

        query_data.offset = 0 + (page - 1) * limit;
        query_data.limit = limit;

    }

    if (sort && order) {
        //order query for sort data by associate table
        query_data.order = [[{ model: BssStudentsModel, as: "grounded_student_data" }, sort, order]];

    }

    BssStudentGroundedModel.findAndCountAll({
        where: where_data, ...query_data,
        attributes:
        {
            exclude: ["created_by", "updated_by", "deleted_by", "created_date", "updated_date",
                "deleted_date"]
        }, include:
        {
            model: BssStudentsModel, as: "grounded_student_data",
            where: include_where_data,
            attributes: ["student_id", "student_uuid", "student_first_name", "student_last_name", "class_id",
                [Sq.fn("PGP_SYM_DECRYPT", Sq.col("unique_pin"), PG_ENCRYPT_KEY), 'unique_pin']

            ]
        }
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get All Grounded Student successfully!"
        })
    }).catch((error) => {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."

        })
    })

}


module.exports.GetGroundedStudentById = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const { student_grounded_uuid } = req.query;
    const BssStudentGroundedModel = await BssStudentGrounded(config_sequelize);
    const BssStudentModel = await BssStudents(config_sequelize);

    BssStudentGroundedModel.findOne({
        where: { student_grounded_uuid },
        attributes:
        {
            exclude: ["created_by", "updated_by", "deleted_by", "created_date", "updated_date",
                "deleted_date"]
        },


        include: {
            model: BssStudentModel, as: "grounded_student_data",
            attributes:
                ["student_uuid", "student_id", "student_first_name", "student_last_name", "class_id"],

        },

    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
        })

    }).catch((error) => {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."

        })
    })
}


module.exports.UpdateStudentGroundedDetails = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const student_grounded_details = req.body;
    const student_grounded_uuid = student_grounded_details.student_grounded_uuid;
    delete student_grounded_details.student_grounded_uuid;
    student_grounded_details.updated_by = login_user.user_id;

    const BssStudentGroundedModel = await BssStudentGrounded(config_sequelize);
    const BssStudentModel = await BssStudents(config_sequelize)
    BssStudentGroundedModel.update(student_grounded_details, { where: { student_grounded_uuid }, returning: true, plain: true }).then(async (response) => {

        const stuResponse = await BssStudentModel.findOne({ where: { student_id: response[1].student_id } })

        let sys_obj = {
            user_id: login_user.user_id,
            action: "updated",
            html_info: `${login_user.first_name} ${login_user.last_name} updated <strong> ${stuResponse.student_first_name} ${stuResponse.student_last_name} </strong> grounded details !`
        }

        SystemLogsFun(sys_obj, config_sequelize)
        res.json({
            status: 200,
            success: true,
            message: "Student Grounded Details updated successfully!"
        })

    }).catch((error) => {
        res.json({
            status: 400,
            success: false,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."

        })
    })
}

module.exports.UpdateGroundedStudentStatus = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user
    const { student_grounded_uuid, is_grounded_activate } = req.body;

    const BssStudentGroundedModel = await BssStudentGrounded(config_sequelize);
    const BssStudentModel = await BssStudents(config_sequelize)

    BssStudentGroundedModel.update({ is_grounded_activate }, { where: { student_grounded_uuid }, returning: true, plain: true }).then(async (response) => {

        const stuResponse = await BssStudentModel.findOne({ where: { student_id: response[1].student_id } })
        let sys_obj = {
            user_id: login_user.user_id,
            action: "updated",
            html_info: `${login_user.first_name} ${login_user.last_name} updated <strong> ${stuResponse.student_first_name} ${stuResponse.student_last_name} </strong> grounded Status ${is_grounded_activate === true || is_grounded_activate === "true" ? "Activated" : "Deactivated"} !`
        }

        SystemLogsFun(sys_obj, config_sequelize)

        res.json({
            status: 200,
            success: true,
            message: `Student Grounded ${is_grounded_activate === true || is_grounded_activate === "true" ? "Activated" : "Deactivated"} successfully!`
        })

    }).catch((error) => {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })

    })
}

module.exports.DeleteStudentGrounded = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user
    const { student_grounded_uuid, student_id } = req.body;

    const BssStudentGroundedModel = await BssStudentGrounded(config_sequelize);
    const BssStudentModel = await BssStudents(config_sequelize)
    BssStudentGroundedModel.destroy({ where: { student_grounded_uuid } }).then((response) => {
        const studentResponse = BssStudentModel.findOne({ where: student_id })
        const sys_obj = {
            user_id: login_user.user_id,
            action: "deleted",
            html_info: `${login_user.first_name} ${login_user.last_name} deleted the <strong> ${studentResponse.student_first_name} ${studentResponse.student_last_name} </strong> Grounded information ! `

        }
        SystemLogsFun(sys_obj, config_sequelize)

        res.json({
            status: 200,
            success: true,
            message: "Student Grounded Details deleted successfully!"
        })
    }).catch((error) => {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })

    })

}

module.exports.GetAllDuplicateStudents = async (req, res) => {
    const { page, limit, sort, order, is_student_activate, search } = req.query;
    const config_sequelize = req.config_sequelize;

    let where_data = { is_duplicate: true, is_student_activate: true };
    let query_data = {};

    if (is_student_activate === "true" || is_student_activate === true) {
        where_data = {
            ...where_data,
            is_student_activate: true
        }
    };
    if (is_student_activate === "false" || is_student_activate === false) {
        where_data = {
            ...where_data,
            is_student_activate: false
        }
    };

    if (search) {
        where_data = {
            ...where_data,
            [Sq.Op.or]: [
                Sq.where(Sq.fn("concat", Sq.col("student_first_name"), " ", Sq.col("student_last_name")), { [Sq.Op.iLike]: `%${search}%` }),

                Sq.where(Sq.fn("LOWER", Sq.fn('PGP_SYM_DECRYPT', Sq.col("student_email"), PG_ENCRYPT_KEY)), "LIKE", search.toLowerCase()),

            ],
        };
    }
    if (page && limit) {

        query_data.offset = 0 + (page - 1) * limit;
        query_data.limit = limit;

    };
    if (sort && order) {
        query_data.order = [[sort, order]]
    }

    const BssStudentsModel = await BssStudents(config_sequelize);
    const BssDormitoriesModel = await BssDormitories(config_sequelize);

    BssStudentsModel.findAndCountAll({

        where: {
            ...where_data,
        },
        attributes: ["student_id", "student_uuid", "student_first_name", "student_last_name",
            "is_student_activate", "class_name", "is_duplicate",
            [Sq.fn("PGP_SYM_DECRYPT", Sq.col("unique_pin"), PG_ENCRYPT_KEY), 'unique_pin']
        ],
        include: {
            model: BssDormitoriesModel, as: "dormitory_data",
            attributes: [[Sq.fn('PGP_SYM_DECRYPT', Sq.col('dormitory_name'), PG_ENCRYPT_KEY), "dormitory_name"]],

        },
        ...query_data,
        hooks: false
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get All Duplicate Student successfully!"

        })
    }).catch((error) => {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })

    })
}

module.exports.UpdateStudentDuplicateStatus = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    let { is_duplicate, duplicate_data } = req.body;

    // duplicate_data = JSON.parse(duplicate_data)
    const BssStudentsModel = await BssStudents(config_sequelize);

    BssStudentsModel.update({
        is_duplicate, updated_by: login_user.user_id
    }, {
        where: {
            student_uuid: {
                [Sq.Op.in]: duplicate_data
                // this will update all the records with an id from the list 
            }
        },
    }
    ).then((response) => {

        console.log("dsffffffffffffffffff", response[1].student_id)
        let sys_obj = {
            user_id: login_user.user_id,
            action: "updated",
            html_info: `${is_duplicate === "true" || is_duplicate === true ? `A duplicate student ${response[1].student_first_name} ${response[1].student_last_name} was added by system in duplicate student list` : `A  duplicate  student ${response[1].student_first_name} ${response[1].student_last_name}  was removed by system from duplicate student list`} !`

        }
        SystemLogsFun(sys_obj, config_sequelize)

        res.json({
            status: 200,
            success: true,
            message: "Student Duplicate Status updated successfully!"
        })
    }).catch((error) => {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error.message,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })

    })
}

module.exports.StudentsRollOver = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    let { class_no, class_id } = req.body;

    let nextClassNumber = class_no;
    // let getClassNumber = parseInt(class_name.replace(/th|st|nd/g, " "));

    nextClassNumber++;

    // if (getClassNumber == 2) {
    //     nextClass = getClassNumber;
    //     //  + "nd"
    // };
    // if (getClassNumber == 3) {
    //     nextClass = getClassNumber;
    //     // + "rd"
    // };
    // if (getClassNumber > 3 && getClassNumber <= 12) {
    //     nextClass = getClassNumber;
    //     //  + "th"
    // };
    const BssStudentsModel = await BssStudents(config_sequelize);
    const BssClassesModel = await BssClasses(config_sequelize);
    if (nextClassNumber && class_id) {
        //check class exist or not
        const classResponse = await BssClassesModel.findOne({ where: { class_no: nextClassNumber } });
        console.log(classResponse)

        if (!classResponse || classResponse === null) {
            return res.json({
                status: 400,
                success: false,
                message: "Roll over students class doesn't exists!"
            })

        }
        BssStudentsModel.update({
            class_id: classResponse.class_id, class_name: classResponse.class_name,
            updated_by: login_user.user_id
        }, {
            where: {
                class_id: class_id
            }
        }
        ).then((response) => {
            let sys_obj = {
                user_id: login_user.user_id,
                action: "created",
                html_info: `Please revise On Campus Destinations Permissions for all Age Groups as the System has rolled over each student to the next Year Level !`
            }
            SystemLogsFun(sys_obj, config_sequelize)
            res.json({
                status: 200,
                success: true,
                message: "Students RollOver successfully!"
            })
        }).catch((error) => {
            console.log(error);
            res.json({
                status: 400,
                success: false,
                error: error,
                message: "Something went wrong. Please try again or reach out to support if the issue persists."
            })

        })
    } else {
        return res.json({
            status: 400,
            success: false,
            message: "Bad Request!"
        })
    }

};

//Change Students Dormitory
module.exports.GetStudentsByDormitoryId = async (req, res) => {
    const { dormitory_id, page, limit, sort, order, search } = req.query;
    const config_sequelize = req.config_sequelize;
    const BssStudentsModel = await BssStudents(config_sequelize);

    let query_data = {};
    let where_data = { dormitory_id };

    if (search) {
        where_data = {
            ...where_data,
            [Sq.Op.or]: [
                //check the first name or last name with case insensitivity
                Sq.where(Sq.fn("concat", Sq.col("student_first_name"), " ", Sq.col("student_last_name")), { [Sq.Op.iLike]: `%${search}%` }),

                Sq.where(Sq.fn("LOWER", Sq.fn('PGP_SYM_DECRYPT', Sq.col("student_email"), PG_ENCRYPT_KEY)), "LIKE", search.toLowerCase()),

            ],
        };
    }

    if (page && limit) {

        query_data.offset = 0 + (page - 1) * limit;
        query_data.limit = limit;

    };
    if (sort && order) {
        query_data.order = [[sort, order]]
    }
    BssStudentsModel.findAndCountAll({
        where: where_data,
        ...query_data,
        attributes: [[Sq.fn("LOWER", Sq.fn('PGP_SYM_DECRYPT', Sq.col("unique_pin"), PG_ENCRYPT_KEY)), "unique_pin"], "student_first_name", "student_last_name", "preferred_name", "student_id",
            "student_uuid", "class_name", "is_student_activate"],
        hooks: false
    }).then((response) => {

        res.json({
            status: 200,
            success: true,
            data: response

        })

    }).catch((error) => {
        console.log(error);
        return res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });

    })
}

module.exports.ChangeStudentsDormitory = async (req, res) => {

    let { students_uuid_data, dormitory_id } = req.body;
    const config_sequelize = req.config_sequelize;
    console.log(req.body);
    students_uuid_data = JSON.parse(students_uuid_data);
    const BssStudentModel = await BssStudents(config_sequelize);

    BssStudentModel.update({ dormitory_id }, { where: { student_uuid: students_uuid_data } }).then((response) => {

        res.json({
            status: 200,
            success: true,
            message: "Dormitory Changed Successfully!"
        })
    }).catch((error) => {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."

        })
    })

};

// module.exports.ImportStudentsCsv = async (req, res) => {
//     const login_user =req.login_user
//     try {

//         const config_sequelize = req.config_sequelize;
//         const school_code = req.headers.school_code;
//         const { class_id, class_name, dormitory_id, user_id, school_name, school_detail_id } = req.body;

//         let csv_student_file_path = `${appRoot}/uploads/${school_code}/${req.file?.filename}`;
//          let errorMessages =[]
//         if (csv_student_file_path) {

//             const BssStudentsModel = await BssStudents(config_sequelize);
//             const BssParentsModel = await BssParents(config_sequelize);
//             const BssParentAddressModel = await BssParentAddress(config_sequelize);

//             let student_details = await BssStudentsModel.findAll();
//             let student_all_details = student_details;
//             student_details = convert_key_array(student_details, "student_email");
//             let parent_details = await BssParentsModel.findAll();
//             parent_details = convert_key_array(parent_details, "father_email");
//             let mother_details = convert_key_array(parent_details, "mother_email");

//             const options = {
//                 objectMode: true,
//                 delimiter: ",",
//                 quote: null,
//                 headers: ["student_first_name", "student_last_name", "preferred_name", "student_email", "student_phone", "gender",
//                     "date_of_birth(YYYY-MM-DD)", "father_name", "father_email", "father_mobile_cell", "father_home_phone",
//                     "father_work_phone", "father_country", "father_line1", "father_line2", "father_line3", "father_line4", "father_postcode",
//                     "mother_name", "mother_email", "mother_mobile_cell", "mother_home_phone",
//                     "mother_work_phone", "mother_country", "mother_line1", "mother_line2", "mother_line3", "mother_line4", "mother_postcode",
//                     "campus_name", "sporting_house", "laundry_number", "tutor_name", "tutor_email",
//                     "salutation", "kiosk_mode_pin",],
//                 renameHeaders: true,
//             };

//             let csv_student_details = [];
//             const readableStream = fs.createReadStream(csv_student_file_path);

//             fastCsv.parseStream(readableStream, options)
//                 .on("error", (error) => {
//                     console.log(error);
//                     return res.json({
//                         status: 400,
//                         success: false,
//                         error: error,
//                         message: "Something went wrong. Please try again or reach out to support if the issue persists."
//                     });

//                 }).on("data", async (row) => {
//                     csv_student_details.push(row);

//                 }).on("end", async (rowCount) => {
//                     console.log(rowCount);

//                     for (const csv_student_key in csv_student_details) {
//                         let student_email = csv_student_details[csv_student_key].student_email;
//                         let student_first_name = csv_student_details[csv_student_key].student_first_name;
//                         let preferred_name = csv_student_details[csv_student_key].preferred_name;
//                         let gender = csv_student_details[csv_student_key].gender;
//                         let date_of_birth = csv_student_details[csv_student_key]["date_of_birth(YYYY-MM-DD)"];
//                         let father_name = csv_student_details[csv_student_key].father_name;
//                         let father_email = csv_student_details[csv_student_key].father_email;
//                         let father_phone = csv_student_details[csv_student_key].father_mobile_cell;
//                         let mother_name = csv_student_details[csv_student_key].mother_name;
//                         let mother_email = csv_student_details[csv_student_key].mother_email;
//                         let mother_phone = csv_student_details[csv_student_key].mother_mobile_cell;
//                         let tutor_name = csv_student_details[csv_student_key].tutor_name;
//                         let father_country = csv_student_details[csv_student_key].father_country;
//                         let mother_country = csv_student_details[csv_student_key].mother_country;
//                         let father_home_phone = csv_student_details[csv_student_key].father_home_phone;


//                         ///////check if required fields value does'nt exists
//                         if (!student_email || !student_first_name || !preferred_name || !gender ||
//                             !date_of_birth || !father_name || !father_email || !father_phone || !mother_name
//                             || !mother_email || !mother_phone || !tutor_name || !father_country && !mother_country) {
//                            errorMessages.push(`${student_first_name} please fill all the mandantry fields at row ${csv_student_key}`);
//                             continue;
//                         };
//                         //////check if student email already exists
//                         if (student_email) {
//                             if (student_details[student_email]) {
//                         errorMessages.push(`email is already exists for student at row ${csv_student_key}`);
//                             }
//                         };

//                         // const validateDateOfBirth = date_of_birth.split(/[\/\-\.]/);
//                         var dateOfBirthRegex = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;
//                         if (dateOfBirthRegex.test(date_of_birth) === false) {
//                             continue;
//                         };
//                         //Get student age from date of birth
//                         csv_student_details[csv_student_key].student_age = await getAge(date_of_birth);

//                         let generate_student_password;
//                         let generate_mother_password;
//                         let generate_father_password;
//                         let mother_username;
//                         let father_username;
//                         /////generate student password
//                         generate_student_password = await generatePassword();
//                         csv_student_details[csv_student_key].student_password = await bcrypt.hash(generate_student_password, 10);

//                         if (parent_details[father_email] || mother_details[mother_email]) {

//                             let checkFatherParentId = await parent_details[father_email]?.parent_id;
//                             let checkMotherParentId = await mother_details[mother_email]?.parent_id;

//                             csv_student_details[csv_student_key].parent_id = checkFatherParentId ?
//                                 checkFatherParentId : checkMotherParentId
//                         };
//                         console.log("--------------", csv_student_details)
//                         ////check if duplicate student preferred name exists
//                         let student_response = await BssStudentsModel.findOne({
//                             where: {
//                                 preferred_name: preferred_name
//                             },
//                         hooks: false
//                         });
//                         if (student_response?.preferred_name.toLowerCase() ==
//                             preferred_name.toLowerCase()) {
//                             csv_student_details[csv_student_key].is_duplicate = true;
//                         };

//                         csv_student_details[csv_student_key].class_id = class_id;
//                         csv_student_details[csv_student_key].class_name = class_name;
//                         csv_student_details[csv_student_key].dormitory_id = dormitory_id;
//                         // csv_student_details[csv_student_key].user_id = user_id;
//                         csv_student_details[csv_student_key].school_detail_id = school_detail_id;
//                         csv_student_details[csv_student_key].student_allergy_status = "no";
//                         csv_student_details[csv_student_key].allergy_unauth_access = "no";
//                         csv_student_details[csv_student_key].student_username = Sq.fn("PGP_SYM_ENCRYPT ", "", PG_ENCRYPT_KEY,);
//                         csv_student_details[csv_student_key].unique_pin = Sq.fn("PGP_SYM_ENCRYPT ", "", PG_ENCRYPT_KEY,);
//                         csv_student_details[csv_student_key].date_of_birth = csv_student_details[csv_student_key]["date_of_birth(YYYY-MM-DD)"];
//                         /********* Create Student ********/
                        

//                         BssStudentsModel.create(csv_student_details[csv_student_key])
//                             .then(async (response) => {
//                                 const student_id = response.student_id;
//                                 /////////create and update add student usename and unique pin
//                                 const student_username = `${school_code}_${response.student_id}_${response.student_first_name.split(" ")[0]}`

//                                 const unique_pin = school_code.slice(0, 3) + student_id;

//                                 await BssStudentsModel.update({
//                                     student_username: Sq.fn("PGP_SYM_ENCRYPT ", student_username, PG_ENCRYPT_KEY,),
//                                     unique_pin: Sq.fn("PGP_SYM_ENCRYPT ", unique_pin, PG_ENCRYPT_KEY,),
//                                 }, { where: { student_id } });

//                                 /////////create parent if parent email not exists or match//////////////
//                                 if ((parent_details[father_email] == undefined &&
//                                     mother_details[mother_email] == undefined) ||
//                                     (!mother_details[mother_email] && parent_details[father_email])) {

//                                     //Generate password parent
//                                     generate_father_password = await generatePassword();
//                                     generate_mother_password = await generatePassword();

//                                     csv_student_details[csv_student_key].father_password = await bcrypt.hash(generate_father_password, 10);
//                                     csv_student_details[csv_student_key].mother_password = await bcrypt.hash(generate_mother_password, 10);

//                                     mother_username = `${school_code}_${response.student_id}_${csv_student_details[csv_student_key].mother_name.split(" ")[0]}`
//                                     father_username = `${school_code}_${response.student_id}_${csv_student_details[csv_student_key].father_name.split(" ")[0]}`
//                                     //encrypt parents name
//                                     csv_student_details[csv_student_key].mother_username = Sq.fn("PGP_SYM_ENCRYPT ", mother_username, PG_ENCRYPT_KEY,)
//                                     csv_student_details[csv_student_key].father_username = Sq.fn("PGP_SYM_ENCRYPT ", father_username, PG_ENCRYPT_KEY,)

//                                     //add value in father phone and mother phone from csv attributes
//                                     csv_student_details[csv_student_key].father_phone = csv_student_details[csv_student_key].father_mobile_cell;
//                                     csv_student_details[csv_student_key].mother_phone = csv_student_details[csv_student_key].mother_mobile_cell;
//                                     console.log(csv_student_details)
//                                     //Create parents
//                                     const BssParentsModel = await BssParents(config_sequelize);
//                                     await BssParentsModel.create(csv_student_details[csv_student_key],).then(async (parentsResponse) => {

//                                         ////////Update the parent id in student 
//                                         await BssStudentsModel.update({ parent_id: parentsResponse.parent_id },
//                                             { where: { student_id: response.student_id } });

//                                         /******   add mother and father address data *********/
//                                         if (csv_student_details[csv_student_key].father_country || csv_student_details[csv_student_key].mother_country) {
//                                             let parentAddressArr = [];
//                                             if (csv_student_details[csv_student_key].father_country && csv_student_details[csv_student_key].father_country !== "") {
//                                                 parentAddressArr = [
//                                                     {
//                                                         parent_id: parentsResponse.parent_id,
//                                                         address_line1: Sq.fn("PGP_SYM_ENCRYPT ", csv_student_details[csv_student_key].father_line1 ? csv_student_details[csv_student_key].father_line1 : "", PG_ENCRYPT_KEY,),
//                                                         address_line2: Sq.fn("PGP_SYM_ENCRYPT ", csv_student_details[csv_student_key].father_line2 ? csv_student_details[csv_student_key].father_line2 : "", PG_ENCRYPT_KEY,),
//                                                         address_line3: Sq.fn("PGP_SYM_ENCRYPT ", csv_student_details[csv_student_key].father_line3 ? csv_student_details[csv_student_key].father_line3 : "", PG_ENCRYPT_KEY,),
//                                                         address_line4: Sq.fn("PGP_SYM_ENCRYPT ", csv_student_details[csv_student_key].father_line4 ? csv_student_details[csv_student_key].father_line4 : "", PG_ENCRYPT_KEY,),
//                                                         parent_postcode: Sq.fn("PGP_SYM_ENCRYPT ", csv_student_details[csv_student_key].father_postcode ? csv_student_details[csv_student_key].father_postcode : "", PG_ENCRYPT_KEY,),
//                                                         parent_country: csv_student_details[csv_student_key].father_country,
//                                                         parent_address_type: "father"
//                                                     }
//                                                 ];
//                                             };
//                                             if (csv_student_details[csv_student_key].mother_country || csv_student_details[csv_student_key].mother_country !== "") {
//                                                 parentAddressArr = [
//                                                     ...parentAddressArr,
//                                                     {
//                                                         parent_id: parentsResponse.parent_id,
//                                                         address_line1: Sq.fn("PGP_SYM_ENCRYPT ", csv_student_details[csv_student_key].mother_line1 ? csv_student_details[csv_student_key].mother_line1 : "", PG_ENCRYPT_KEY,),
//                                                         address_line2: Sq.fn("PGP_SYM_ENCRYPT ", csv_student_details[csv_student_key].mother_line2 ? csv_student_details[csv_student_key].mother_line2 : "", PG_ENCRYPT_KEY,),
//                                                         address_line3: Sq.fn("PGP_SYM_ENCRYPT ", csv_student_details[csv_student_key].mother_line3 ? csv_student_details[csv_student_key].mother_line3 : "", PG_ENCRYPT_KEY,),
//                                                         address_line4: Sq.fn("PGP_SYM_ENCRYPT ", csv_student_details[csv_student_key].mother_line4 ? csv_student_details[csv_student_key].mother_line4 : "", PG_ENCRYPT_KEY,),
//                                                         parent_postcode: Sq.fn("PGP_SYM_ENCRYPT ", csv_student_details[csv_student_key].mother_postcode ? csv_student_details[csv_student_key].mother_postcode : "", PG_ENCRYPT_KEY,),
//                                                         parent_country: csv_student_details[csv_student_key].mother_country,
//                                                         parent_address_type: "mother"
//                                                     }
//                                                 ];
//                                             };
//                                             await BssParentAddressModel.bulkCreate(parentAddressArr);

//                                         };
//                                     });
//                                 };
                                
//                                 // let sys_obj ={
//                                 //     user_id:login_user.user_id,
//                                 //     action:"created",
//                                 //     html_info:`Students were added from a CSV file to the [Class_name] in the [dom_name] .`
//                                 // }

//                                 // /************* System Email Start for send login info **********************/
//                                 let emailsDetails = [{
//                                     email_name: csv_student_details[csv_student_key].student_first_name + csv_student_details[csv_student_key].student_last_name,
//                                     email_address: csv_student_details[csv_student_key].student_email,
//                                     email_username: student_username,
//                                     email_password: generate_student_password,
//                                     email_template_name: "StudentRegistration.html",
//                                     email_subject: "Student Login"
//                                 },];

//                                 if ((parent_details[father_email] == undefined &&
//                                     mother_details[mother_email] == undefined) ||
//                                     (!mother_details[mother_email] && parent_details[father_email])) {
//                                     emailsDetails.push({

//                                         email_name: csv_student_details[csv_student_key].mother_name,
//                                         email_address: csv_student_details[csv_student_key].mother_email,
//                                         email_username: mother_username,
//                                         email_password: generate_mother_password,
//                                         email_template_name: "ParentsRegistration.html",
//                                         email_subject: "Parents Login"
//                                     }, {
//                                         email_name: csv_student_details[csv_student_key].father_name,
//                                         email_address: csv_student_details[csv_student_key].father_email,
//                                         email_username: father_username,
//                                         email_password: generate_father_password,
//                                         email_template_name: "ParentsRegistration.html",
//                                         email_subject: "Parents Login"
//                                     })
//                                 }
//                                 emailsDetails.forEach((emailValues) => {

//                                     let email_parametars = {
//                                         email_name: emailValues.email_name,
//                                         email_username: emailValues.email_username,
//                                         email_password: emailValues.email_password,
//                                         school_code: school_code,
//                                         school_name: school_name,
//                                         APP_URL: process.env.APP_URL,
//                                     };
//                                     let email_template = fs.readFileSync(appRoot + `/src/Services/Views/email-templates/${emailValues.email_template_name}`, "utf8");

//                                     email_template = email_template.replace(/email_name|email_username|email_password|school_code|school_name|APP_URL/gi, function (matched) {
//                                         return email_parametars[matched];
//                                     });
//                                     let mailOptions = {
//                                         from: process.env.MAIL_FROM_ADDRESS,
//                                         to: emailValues.email_address,
//                                         subject: `BSS -${emailValues.email_subject} Registration Successfully!`,
//                                         html: email_template,
//                                     };
//                                     SendEmail(mailOptions)
//                                         .then((info) => {
//                                             console.log("Nodemailer Email sent-------------------", info.response);
//                                         })
//                                         .catch((error) => {
//                                             console.log("Nodemailer error ----------------", error);
//                                         });
//                                 });
//                                 // /***********************End System Email **********************/
//                             });
//                     }
//                     await DeleteFile(csv_student_file_path);

//                     if(errorMessages.length>0){
//                         return res.json({
//                             status: 200,
//                             success: true,
//                             message: errorMessages
//                         });
                        
//                     }
                    
//                     sys_obj = {
//                         user_id: login_user.user_id,
//                         action: "created",
//                         html_info: `Students were added from a CSV file in the ${class_name}! `
//                     }

//                     SystemLogsFun(sys_obj, config_sequelize)
                    

//                     return res.json({
//                         status: 200,
//                         success: true,
//                         message: "Student Import successfully!",
//                     });
//                 });

//         } else {
//             return res.json({
//                 status: 400,
//                 success: false,
//                 message: "Bad Request!",
//             });
//         }
//     } catch (error) {
//         console.log(error);
//         return res.json({
//             status: 400,
//             success: false,
//             error: error,
//             message: "Something went wrong. Please try again or reach out to support if the issue persists."
//         });
//     };
// };



module.exports.ImportStudentsCsv = async (req, res) => {
    try {

        const config_sequelize = req.config_sequelize;
        const school_code = req.headers.school_code;
        const login_user =req.login_user
        const { class_id, class_name, dormitory_id, user_id, school_name, school_detail_id } = req.body;
        let csv_student_file_path = `${appRoot}/uploads/${school_code}/${req.file?.filename}`;


        if (csv_student_file_path) {

            const BssStudentsModel = await BssStudents(config_sequelize);
            const BssParentsModel = await BssParents(config_sequelize);
            const BssParentAddressModel = await BssParentAddress(config_sequelize);

            let student_details = await BssStudentsModel.findAll();
            let student_all_details = student_details;
            student_details = convert_key_array(student_details, "student_email");
            let parent_details = await BssParentsModel.findAll();
            parent_details = convert_key_array(parent_details, "father_email");
            let mother_details = convert_key_array(parent_details, "mother_email");

            const options = {
                objectMode: true,
                delimiter: ",",
                quote: null,
                headers: ["student_first_name", "student_last_name", "preferred_name", "student_email", "student_phone", "gender",
                    "date_of_birth(YYYY-MM-DD)", "father_name", "father_email", "father_mobile_cell", "father_home_phone",
                    "father_work_phone", "father_country", "father_line1", "father_line2", "father_line3", "father_line4", "father_postcode",
                    "mother_name", "mother_email", "mother_mobile_cell", "mother_home_phone",
                    "mother_work_phone", "mother_country", "mother_line1", "mother_line2", "mother_line3", "mother_line4", "mother_postcode",
                    "campus_name", "sporting_house", "laundry_number", "tutor_name", "tutor_email",
                    "salutation", "kiosk_mode_pin",],
                renameHeaders: true,
            };

            let csv_student_details = [];
            const readableStream = fs.createReadStream(csv_student_file_path);

            fastCsv.parseStream(readableStream, options)
                .on("error", (error) => {
                    console.log(error);
                    return res.json({
                        status: 400,
                        success: false,
                        error: error,
                        message: "Something went wrong. Please try again or reach out to support if the issue persists."
                    });

                }).on("data", async (row) => {
                    csv_student_details.push(row);

                }).on("end", async (rowCount) => {
                    console.log(rowCount);

                    const errorMessages = csv_student_details.reduce((errors, student, csv_student_key) => {
                        const {
                            student_email,
                            student_first_name,
                            preferred_name,
                            gender,
                            date_of_birth,
                            father_name,
                            father_email,
                            father_phone,
                            mother_name,
                            mother_email,
                            mother_phone,
                            tutor_name,
                            father_country,
                            mother_country,
                            kiosk_mode_pin,
                        } = student;
                    
                        if (
                            !student_email||
                            !student_first_name ||
                            !preferred_name ||
                            !gender ||
                            !date_of_birth ||
                            !father_name ||
                            !father_email ||
                            !father_phone ||
                            !mother_name ||
                            !mother_email ||
                            !mother_phone ||
                            !tutor_name ||
                            (!father_country && !mother_country) ||
                            !kiosk_mode_pin
                        ) {
                            errors.push(`Please fill all the mandatory fields at row ${csv_student_key}`);
                        }
                    
                        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                    
                        if (
                            student[student_email] ||
                            emailRegex.test(student_email) === false ||
                            emailRegex.test(father_email) === false ||
                            emailRegex.test(mother_email) === false
                        ) {
                            errors.push(`Duplicate or incorrect email address at row ${csv_student_key}`);
                        }
                    
                        if (student_kiosk_mode_pin && student_kiosk_mode_pin[kiosk_mode_pin]) {
                            errors.push(`Duplicate or incorrect KioskPin at row ${csv_student_key}`);
                        }
                    
                        const dateOfBirthRegex = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;
                    
                        if (dateOfBirthRegex.test(date_of_birth) === false) {
                            errors.push(`Please ensure that the Date of Birth format is valid (YYYY-MM-DD) at row ${csv_student_key}`);
                        }
                    
                        return errors;
                    }, []);
                
                    
                    if (errorMessages.length > 0) {
                        return res.json({
                            status: 400,
                            success: false,
                            error: errorMessages,
                            data: csv_student_details,
                            message: "Validation failed for some rows. Please correct the issues and try again."
                     
                        })
                    }
                })

                //     console.log("--------------", csv_student_details)
                // })

                //     return res.json({
                //         status: 200,
                //         success: true,
                //         message: "Preview of Student_details successfully!",
                //     });
                // // });

        } else {
            return res.json({
                status: 400,
                success: false,
                message: "Bad Request!",
            });
        }
    } catch (error) {
        console.log(error);
        return res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });
    };
};

module.exports.ImportStudentsCsv = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;
        const school_code = req.headers.school_code;
        const login_user = req.login_user;
        const { class_id, class_name, dormitory_id, dormitory_name, user_id, school_name, school_detail_id } = req.body;
        let errorMessages =[]
           
        if(!req.file.filename){
            errorMessages.push("Incorrect file")  
        }
        let csv_student_file_path = `${appRoot}/uploads/${school_code}/${req.file?.filename}`;

        if (csv_student_file_path) {
            const BssStudentsModel = await BssStudents(config_sequelize);
            const BssParentsModel = await BssParents(config_sequelize);
            const BssParentAddressModel = await BssParentAddress(config_sequelize);

            let student_details = await BssStudentsModel.findAll();
            let student_all_details = student_details;
            student_details = convert_key_array(student_details, "student_email");
            student_kiosk_mode_pin = convert_key_array(student_details, "kiosk_mode_pin");


            let parent_details = await BssParentsModel.findAll();
            parent_details = convert_key_array(parent_details, "father_email");
            let mother_details = convert_key_array(parent_details, "mother_email");

            const options = {
                objectMode: true,
                delimiter: ",",
                quote: null,
                headers: ["student_first_name", "student_last_name", "preferred_name", "student_email", "student_phone", "gender",
                    "date_of_birth(YYYY-MM-DD)", "father_name", "father_email", "father_mobile_cell", "father_home_phone",
                    "father_work_phone", "father_country", "father_line1", "father_line2", "father_line3", "father_line4", "father_postcode",
                    "mother_name", "mother_email", "mother_mobile_cell", "mother_home_phone",
                    "mother_work_phone", "mother_country", "mother_line1", "mother_line2", "mother_line3", "mother_line4", "mother_postcode",
                    "campus_name", "sporting_house", "laundry_number", "tutor_name", "tutor_email",
                    "salutation", "kiosk_mode_pin",],
                renameHeaders: true,
            };

            let csv_student_details = [];
            const readableStream = fs.createReadStream(csv_student_file_path);

            fastCsv.parseStream(readableStream, options)
                .on("error", (error) => {
                    console.log(error);
                    return res.json({
                        status: 400,
                        success: false,
                        error: error,
                        message: "Something went wrong. Please try again or reach out to support if the issue persists."
                    });

                }).on("data", async (row) => {
                    csv_student_details.push(row);

                }).on("end", async (rowCount) => {
                    console.log(rowCount);

                    for (const csv_student_key in csv_student_details) {
                        let student_email = csv_student_details[csv_student_key].student_email;
                        let student_first_name = csv_student_details[csv_student_key].student_first_name;
                        let preferred_name = csv_student_details[csv_student_key].preferred_name;
                        let gender = csv_student_details[csv_student_key].gender;
                        let date_of_birth = csv_student_details[csv_student_key]["date_of_birth(YYYY-MM-DD)"];
                        let father_name = csv_student_details[csv_student_key].father_name;
                        let father_email = csv_student_details[csv_student_key].father_email;
                        let father_phone = csv_student_details[csv_student_key].father_mobile_cell;
                        let mother_name = csv_student_details[csv_student_key].mother_name;
                        let mother_email = csv_student_details[csv_student_key].mother_email;
                        let mother_phone = csv_student_details[csv_student_key].mother_mobile_cell;
                        let tutor_name = csv_student_details[csv_student_key].tutor_name;
                        let father_country = csv_student_details[csv_student_key].father_country;
                        let mother_country = csv_student_details[csv_student_key].mother_country;
                        let kiosk_mode_pin = csv_student_details[csv_student_key].kiosk_mode_pin;




                        ///////check if required fields value does'nt exists
                        if (!student_email || !student_first_name || !preferred_name || !gender ||
                            !date_of_birth || !father_name || !father_email || !father_phone || !mother_name
                            || !mother_email || !mother_phone || !tutor_name || !father_country && !mother_country,!kiosk_mode_pin) {
                                errorMessages.push(`Please fill all the mandatory fields at row ${csv_student_key}`);
                                continue;
                        };
                        //////check if student email already exists 
                        if (student_email) {
                            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                            if (student_details[student_email] || emailRegex.test(student_email) === false ||emailRegex.test(father_email) === false ||emailRegex.test(mother_email) === false  ) {
                                errorMessages.push(`Duplicate or incorrect email address at row ${csv_student_key}`);
                                continue;
                            }
                        };

                        if(student_kiosk_mode_pin){
                            if (student_kiosk_mode_pin[kiosk_mode_pin]) {
                                errorMessages.push(`Duplicate or incorrect KioskPin  at row ${csv_student_key}`);
                                continue;
                            }
                        }
                        date_of_birth = moment(date_of_birth, 'DD-MM-YYYY').format('YYYY-MM-DD'); // Use lowercase 'd' for day
                        // const validateDateOfBirth = date_of_birth.split(/[\/\-\.]/);
                        var dateOfBirthRegex = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;
                        if (dateOfBirthRegex.test(date_of_birth) === false) {
                            errorMessages.push(`Please ensure that the Date of Birth format is valid (YYYY-MM-DD) at row ${csv_student_key}`);
                            continue;
                           
                        };
                    }
                        if (errorMessages.length > 0) {
                            return res.json({
                                status: 400,
                                success: false,
                                error: errorMessages,
                                message: "Validation failed for some rows. Please correct the issues and try again."
                            });
                        }
                        for (const csv_student_key in csv_student_details) {
                            let preferred_name = csv_student_details[csv_student_key].preferred_name;
                           
                            let date_of_birth = csv_student_details[csv_student_key]["date_of_birth(YYYY-MM-DD)"];
                         
                            let father_email = csv_student_details[csv_student_key].father_email;
                         
                            let mother_email = csv_student_details[csv_student_key].mother_email;
                         
                        //Get student age from date of birth
                        csv_student_details[csv_student_key].student_age = await getAge(date_of_birth);
                        let generate_student_password;
                        let generate_mother_password;
                        let generate_father_password;
                        let mother_username;
                        let father_username;
                        /////generate student password
                        generate_student_password = await generatePassword();
                        csv_student_details[csv_student_key].student_password = await bcrypt.hash(generate_student_password, 10);

                        if (parent_details[father_email] || mother_details[mother_email]) {

                            let checkFatherParentId = await parent_details[father_email]?.parent_id;
                            let checkMotherParentId = await mother_details[mother_email]?.parent_id;

                            csv_student_details[csv_student_key].parent_id = checkFatherParentId ?
                                checkFatherParentId : checkMotherParentId
                        };
                        // console.log("--------------", csv_student_details)
                        ////check if duplicate student preferred name exists


                        let student_response = await BssStudentsModel.findOne({
                            where: {
                                preferred_name: preferred_name
                            },
                            hooks: false
                        });
                        if (student_response?.preferred_name.toLowerCase() ==
                            preferred_name.toLowerCase()) {
                            csv_student_details[csv_student_key].is_duplicate = true;
                        };
                        csv_student_details[csv_student_key].class_id = class_id;
                        csv_student_details[csv_student_key].class_name = class_name;
                        csv_student_details[csv_student_key].dormitory_id = dormitory_id;
                        // csv_student_details[csv_student_key].user_id = user_id;
                        csv_student_details[csv_student_key].school_detail_id = school_detail_id;
                        csv_student_details[csv_student_key].student_allergy_status = "no";
                        csv_student_details[csv_student_key].allergy_unauth_access = "no";
                        csv_student_details[csv_student_key].student_username = Sq.fn("PGP_SYM_ENCRYPT ", "", PG_ENCRYPT_KEY,);
                        csv_student_details[csv_student_key].unique_pin = Sq.fn("PGP_SYM_ENCRYPT ", "", PG_ENCRYPT_KEY,);
                        csv_student_details[csv_student_key].date_of_birth = csv_student_details[csv_student_key]["date_of_birth(YYYY-MM-DD)"];
                        /********* Create Student ********/

                        BssStudentsModel.create(csv_student_details[csv_student_key],)
                            .then(async (response) => {
                                const student_id = response.student_id;

                                /////////create and update add student usename and unique pin
                                const student_username = `${school_code}_${response.student_id}_${response.student_first_name.split(" ")[0]}`

                                const unique_pin = school_code.slice(0, 3) + student_id;

                                await BssStudentsModel.update({
                                    student_username: Sq.fn("PGP_SYM_ENCRYPT ", student_username, PG_ENCRYPT_KEY,),
                                    unique_pin: Sq.fn("PGP_SYM_ENCRYPT ", unique_pin, PG_ENCRYPT_KEY,),
                                }, { where: { student_id } });

                                /////////create parent if parent email not exists or match//////////////
                                if ((parent_details[father_email] == undefined &&
                                    mother_details[mother_email] == undefined) ||
                                    (!mother_details[mother_email] && parent_details[father_email])) {

                                    //Generate password parent
                                    generate_father_password = await generatePassword();
                                    generate_mother_password = await generatePassword();

                                    csv_student_details[csv_student_key].father_password = await bcrypt.hash(generate_father_password, 10);
                                    csv_student_details[csv_student_key].mother_password = await bcrypt.hash(generate_mother_password, 10);

                                    mother_username = `${school_code}_${response.student_id}_${csv_student_details[csv_student_key].mother_name.split(" ")[0]}`
                                    father_username = `${school_code}_${response.student_id}_${csv_student_details[csv_student_key].father_name.split(" ")[0]}`
                                    //encrypt parents name
                                    csv_student_details[csv_student_key].mother_username = Sq.fn("PGP_SYM_ENCRYPT ", mother_username, PG_ENCRYPT_KEY,)
                                    csv_student_details[csv_student_key].father_username = Sq.fn("PGP_SYM_ENCRYPT ", father_username, PG_ENCRYPT_KEY,)

                                    //add value in father phone and mother phone from csv attributes
                                    csv_student_details[csv_student_key].father_phone = csv_student_details[csv_student_key].father_mobile_cell;
                                    csv_student_details[csv_student_key].mother_phone = csv_student_details[csv_student_key].mother_mobile_cell;
                                    // console.log(csv_student_details)
                                    console.log("--------------", csv_student_details[csv_student_key])

                                    //Create parents
                                    const BssParentsModel = await BssParents(config_sequelize);
                                    await BssParentsModel.create(csv_student_details[csv_student_key],).then(async (parentsResponse) => {

                                        ////////Update the parent id in student 
                                        await BssStudentsModel.update({ parent_id: parentsResponse.parent_id},
                                            { where: { student_id: response.student_id }});

                                        /******   add mother and father address data *********/
                                        if (csv_student_details[csv_student_key].father_country || csv_student_details[csv_student_key].mother_country) {
                                            let parentAddressArr = [];
                                            if (csv_student_details[csv_student_key].father_country && csv_student_details[csv_student_key].father_country !== "") {
                                                parentAddressArr = [
                                                    {
                                                        parent_id: parentsResponse.parent_id,
                                                        address_line1: Sq.fn("PGP_SYM_ENCRYPT ", csv_student_details[csv_student_key].father_line1 ? csv_student_details[csv_student_key].father_line1 : "", PG_ENCRYPT_KEY,),
                                                        address_line2: Sq.fn("PGP_SYM_ENCRYPT ", csv_student_details[csv_student_key].father_line2 ? csv_student_details[csv_student_key].father_line2 : "", PG_ENCRYPT_KEY,),
                                                        address_line3: Sq.fn("PGP_SYM_ENCRYPT ", csv_student_details[csv_student_key].father_line3 ? csv_student_details[csv_student_key].father_line3 : "", PG_ENCRYPT_KEY,),
                                                        address_line4: Sq.fn("PGP_SYM_ENCRYPT ", csv_student_details[csv_student_key].father_line4 ? csv_student_details[csv_student_key].father_line4 : "", PG_ENCRYPT_KEY,),
                                                        parent_postcode: Sq.fn("PGP_SYM_ENCRYPT ", csv_student_details[csv_student_key].father_postcode ? csv_student_details[csv_student_key].father_postcode : "", PG_ENCRYPT_KEY,),
                                                        parent_country: csv_student_details[csv_student_key].father_country,
                                                        parent_address_type: "father"
                                                    }
                                                ];
                                            };
                                            if(csv_student_details[csv_student_key].mother_country || csv_student_details[csv_student_key].mother_country !== "") {
                                                parentAddressArr = [
                                                    ...parentAddressArr,
                                                    {
                                                        parent_id: parentsResponse.parent_id,
                                                        address_line1: Sq.fn("PGP_SYM_ENCRYPT ", csv_student_details[csv_student_key].mother_line1 ? csv_student_details[csv_student_key].mother_line1 : "", PG_ENCRYPT_KEY,),
                                                        address_line2: Sq.fn("PGP_SYM_ENCRYPT ", csv_student_details[csv_student_key].mother_line2 ? csv_student_details[csv_student_key].mother_line2 : "", PG_ENCRYPT_KEY,),
                                                        address_line3: Sq.fn("PGP_SYM_ENCRYPT ", csv_student_details[csv_student_key].mother_line3 ? csv_student_details[csv_student_key].mother_line3 : "", PG_ENCRYPT_KEY,),
                                                        address_line4: Sq.fn("PGP_SYM_ENCRYPT ", csv_student_details[csv_student_key].mother_line4 ? csv_student_details[csv_student_key].mother_line4 : "", PG_ENCRYPT_KEY,),
                                                        parent_postcode: Sq.fn("PGP_SYM_ENCRYPT ", csv_student_details[csv_student_key].mother_postcode ? csv_student_details[csv_student_key].mother_postcode : "", PG_ENCRYPT_KEY,),
                                                        parent_country: csv_student_details[csv_student_key].mother_country,
                                                        parent_address_type: "mother"
                                                    }
                                                ];
                                            };
                                            await BssParentAddressModel.bulkCreate(parentAddressArr);
                                        };
                                    });
                                };

                                // /************* System Email Start for send login info **********************/
                                let emailsDetails = [{
                                    email_name: csv_student_details[csv_student_key].student_first_name + csv_student_details[csv_student_key].student_last_name,
                                    email_address: csv_student_details[csv_student_key].student_email,
                                    email_username: student_username,
                                    email_password: generate_student_password,
                                    email_template_name: "StudentRegistration.html",
                                    email_subject: "Student Login"
                                },];
                                if ((parent_details[father_email] == undefined &&
                                    mother_details[mother_email] == undefined)||
                                    (!mother_details[mother_email] && parent_details[father_email])) {     
                                    emailsDetails.push({
                                        email_name: csv_student_details[csv_student_key].mother_name,
                                        email_address: csv_student_details[csv_student_key].mother_email,
                                        email_username: mother_username,
                                        email_password: generate_mother_password,
                                        email_template_name: "ParentsRegistration.html",
                                        email_subject: "Parents Login"
                                    }, {
                                        email_name: csv_student_details[csv_student_key].father_name,
                                        email_address: csv_student_details[csv_student_key].father_email,
                                        email_username: father_username,
                                        email_password: generate_father_password,
                                        email_template_name: "ParentsRegistration.html",
                                        email_subject: "Parents Login"
                                    })
                                }

                                emailsDetails.forEach((emailValues) => {
                                    let email_parametars = {
                                        email_name: emailValues.email_name,
                                        email_username: emailValues.email_username,
                                        email_password: emailValues.email_password,
                                        school_code: school_code,
                                        school_name: school_name,
                                        APP_URL: process.env.APP_URL,
                                    };
                                    let email_template = fs.readFileSync(appRoot + `/src/Services/Views/email-templates/${emailValues.email_template_name}`, "utf8");

                                    email_template = email_template.replace(/email_name|email_username|email_password|school_code|school_name|APP_URL/gi, function (matched) {
                                        return email_parametars[matched];
                                    });
                                    let mailOptions = {
                                        from: process.env.MAIL_FROM_ADDRESS,
                                        to: emailValues.email_address,
                                        subject: `BSS -${emailValues.email_subject} Registration Successfully!`,
                                        html: email_template,
                                    };
                                    SendEmail(mailOptions)
                                        .then((info) => {
                                            console.log("Nodemailer Email sent-------------------", info.response);
                                        })
                                        .catch((error) => {
                                            console.log("Nodemailer error ----------------", error);
                                        });
                                });
                                // /***********************End System Email **********************/
                            });
                    }
                    await DeleteFile(csv_student_file_path);
// console.log(":::::::::::::::::::::::::::erorrrrrrrrrrrr",errorMessages)
                    // if (errorMessages.length > 0) {
                    //     return res.json({
                    //         status: 400,
                    //         success: false,
                    //         error: errorMessages,
                    //         message: "Validation failed for some rows. Please correct the issues and try again."
                    //     });
                    // }

                    sys_obj = {
                        user_id: login_user.user_id,
                        action: "Import Students Csv",
                        html_info:`Students were added from a CSV file to ${class_name} in the ${dormitory_name}.`
                    }
                    SystemLogsFun(sys_obj, config_sequelize)
                    if(!errorMessages.length>0){
                    return res.json({
                        status: 200,
                        success: true,
                        message: "Student Import from CSV successfully",
                    });
                }
                });

        } else {
            return res.json({
                status: 400,
                success: false,
                message: "Bad Request!",
            });
        }
    } catch (error) {
        console.log(error);
        return res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });
    };
};



module.exports.ExportStudentsCsv = async (req, res) => {
    const { sort, order, search, gender, dormitory_id, class_id, is_student_activate, student_age } = req.query;
    const config_sequelize = req.config_sequelize;
    const school_code = req.headers.school_code;
    let where_data = {};
    let query_data = {};
    let attributes_data = await StudentsCsvAttributes();

    if (gender) {
        where_data = {
            ...where_data,
            gender: gender
        }
    };
    if (dormitory_id) {
        where_data = {
            ...where_data,
            dormitory_id: dormitory_id
        }

    };
    if (is_student_activate === "true" || is_student_activate === true) {
        where_data = {
            ...where_data,
            is_student_activate: true
        }

    };
    if (is_student_activate === "false" || is_student_activate === false) {
        where_data = {
            ...where_data,
            is_student_activate: false
        }
    };
    if (class_id) {
        where_data = {
            ...where_data,
            class_id: class_id
        }

    };
    if (student_age) {
        where_data = {
            ...where_data,
            student_age: student_age
        }
    }

    if (search) {
        where_data = {
            ...where_data,
            [Sq.Op.or]: [
                //check the first name or last name with case insensitivity
                Sq.where(Sq.fn("concat", Sq.col("student_first_name"), " ", Sq.col("student_last_name")), { [Sq.Op.iLike]: `%${search}%` }),

                Sq.where(Sq.fn("LOWER", Sq.fn('PGP_SYM_DECRYPT', Sq.col("student_email"), PG_ENCRYPT_KEY)), "LIKE", search.toLowerCase()),

            ],
        };
    }

    if (sort && order) {

        query_data.order = [[sort, order]]

    };

    if (search) {
        where_data = {
            where_data,
            [Sq.Op.or]: [
                //check the first name or last name with case insensitivity
                Sq.where(Sq.fn("concat", Sq.col("student_first_name"), " ", Sq.col("student_last_name")), { [Sq.Op.iLike]: `%${search}%` }),

                Sq.where(Sq.fn("LOWER", Sq.fn('PGP_SYM_DECRYPT', Sq.col("student_email"), PG_ENCRYPT_KEY)), "LIKE", search.toLowerCase()),

            ],
        };
    }

    const BssStudentsModel = await BssStudents(config_sequelize);
    const BssParentsModel = await BssParents(config_sequelize);
    BssStudentsModel.findAll({
        where: where_data,
        ...attributes_data,
        include: {
            model: BssParentsModel, as: "parent_data",
            attributes: []
        },
        ...query_data, hooks: false, raw: true

    }).then((response) => {

        console.log(response)

        let responseToJsonData = JSON.stringify(response);

        let parseData = JSON.parse(responseToJsonData);

        let file_name = `Export-StudentsCsv-${new Date().getTime()}.csv`;
        let uploadFilePath = `uploads/${school_code}/${file_name}`;
        const createCsvFile = fs.createWriteStream(uploadFilePath);

        fastCsv.write(parseData, { headers: true }).on("finish", function () {

            return res.json({
                status: 200,
                success: true,
                message: "Student's Csv Export Successfully!",
                file: process.env.APP_URL + "/" + uploadFilePath
            });

        }).pipe(createCsvFile);

        // Delete the file after 10 seconds
        setTimeout(async () => {
            let filePath = `${appRoot}/${uploadFilePath}`;
            await DeleteFile(filePath)
        }, "10000");

    }).catch((error) => {

        console.log(error);
        return res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });

    })

}

module.exports.ExportStudentsPdf = async (req, res) => {
    const { sort, order, search, gender, dormitory_id, class_id, is_student_activate, student_age, school_name, current_local_time } = req.query;
    const config_sequelize = req.config_sequelize;
    const school_code = req.headers.school_code;
    let where_data = {};
    let query_data = {};


    if (gender) {
        where_data = {
            ...where_data,
            gender: gender
        }
    };
    if (dormitory_id) {
        where_data = {
            ...where_data,
            dormitory_id: dormitory_id
        }

    };
    if (is_student_activate === "true" || is_student_activate === true) {
        where_data = {
            ...where_data,
            is_student_activate: true
        }

    };
    if (is_student_activate === "false" || is_student_activate === false) {
        where_data = {
            ...where_data,
            is_student_activate: false
        }
    };
    if (class_id) {
        where_data = {
            ...where_data,
            class_id: class_id
        }

    };
    if (student_age) {
        where_data = {
            ...where_data,
            student_age: student_age
        }
    }

    if (search) {
        where_data = {
            ...where_data,
            [Sq.Op.or]: [
                //check the first name or last name with case insensitivity
                Sq.where(Sq.fn("concat", Sq.col("student_first_name"), " ", Sq.col("student_last_name")), { [Sq.Op.iLike]: `%${search}%` }),

                Sq.where(Sq.fn("LOWER", Sq.fn('PGP_SYM_DECRYPT', Sq.col("student_email"), PG_ENCRYPT_KEY)), "LIKE", search.toLowerCase()),

            ],
        };
    }

    if (sort && order) {

        query_data.order = [[sort, order]]
    };

    if (search) {
        where_data = {
            ...where_data,
            [Sq.Op.or]: [
                //check the first name or last name with case insensitivity
                Sq.where(Sq.fn("concat", Sq.col("student_first_name"), " ", Sq.col("student_last_name")), { [Sq.Op.iLike]: `%${search}%` }),

                Sq.where(Sq.fn("LOWER", Sq.fn('PGP_SYM_DECRYPT', Sq.col("student_email"), PG_ENCRYPT_KEY)), "LIKE", search.toLowerCase()),

            ],
        };
    }
    const BssStudentsModel = await BssStudents(config_sequelize);
    const BssDormitoriesModel = await BssDormitories(config_sequelize);
    BssStudentsModel.findAll({
        where: where_data,
        attributes: [
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('unique_pin'), PG_ENCRYPT_KEY), "unique_pin"],
            [Sq.fn('concat', Sq.col("student_first_name"), ' ', Sq.col("student_last_name")), "student_name"],
            "class_name",
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('dormitory_data.dormitory_name'), PG_ENCRYPT_KEY), "dormitory_name"],
            "student_age",
            "gender"
        ],

        include: { model: BssDormitoriesModel, as: "dormitory_data", attributes: [] },

        ...query_data, hooks: false, raw: true

    }).then((response) => {

        let file_name = `Export-StudentsPdf-${new Date().getTime()}.pdf`;
        let uploadFilePath = `uploads/${school_code}/${file_name}`;
        const createPdfFile = fs.createWriteStream(uploadFilePath);

        // init document
        let doc = new PDFDocument({ margin: 25, size: 'A4' });
        // save document

        doc.pipe(createPdfFile);

        // table
        const table = {
            // DateTime.local(2017, 5, 15, 17, 36)
            title: school_name,
            subtitle: `Generated by Boarding School Suit (${DateTime.fromFormat(current_local_time, 'MM-dd-yyyy').toFormat('MM-dd-yyyy')})`,
            headers: [
                { label: "Student Id", property: 'unique_pin', width: 80, renderer: null, padding: 5, },
                { label: "Student Name", property: 'student_name', width: 155, renderer: null },
                { label: "Class", property: 'class_name', width: 70, renderer: null },
                { label: "Dormitory", property: 'dormitory_name', width: 130, renderer: null },
                { label: "Age", property: 'student_age', width: 60, renderer: null },
                { label: "Gender", property: 'gender', width: 50, },
                ,
            ],
            // complex data
            datas: [...response,],
            rows: [],
        };
        console.log(response)
        doc.table(table, {
            // columnsSize: [100, 110, 100, 100, 90,100], 
            // padding: 5
            prepareHeader: () => doc.font("Helvetica-Bold").fontSize(11),
            // prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
            // doc.font("Helvetica").fontSize(10);
            // },
        });
        doc.end();
        res.json({
            status: 200,
            success: true,
            message: "Student's Pdf Exported Successfully!",
            file: process.env.APP_URL + "/" + uploadFilePath
        });

        // Delete the file after 10 seconds
        setTimeout(async () => {
            let filePath = `${appRoot}/${uploadFilePath}`;
            await DeleteFile(filePath)
        }, "10000");

    }).catch((error) => {

        console.log(error);
        return res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });

    })

}

module.exports.GetAllStudentsForCard = async (req, res) => {
    const { page, limit, sort, order, search, gender, dormitory_id, class_id, is_student_activate, student_age } = req.query;
    const config_sequelize = req.config_sequelize;
    const school_code = req.headers.school_code;
    let where_data = {};
    let query_data = {};

    if (gender) {
        where_data = {
            ...where_data,
            gender: gender
        }
    };
    if (dormitory_id) {
        where_data = {
            ...where_data,
            dormitory_id: dormitory_id
        }

    };
    if (is_student_activate === "true" || is_student_activate === true) {
        where_data = {
            ...where_data,
            is_student_activate: true
        }

    };
    if (is_student_activate === "false" || is_student_activate === false) {
        where_data = {
            ...where_data,
            is_student_activate: false
        }
    };
    if (class_id) {
        where_data = {
            ...where_data,
            class_id: class_id
        }

    };
    if (student_age) {
        where_data = {
            ...where_data,
            student_age: student_age
        }
    }

    if (search) {
        where_data = {
            ...where_data,
            [Sq.Op.or]: [
                //check the first name or last name with case insensitivity
                Sq.where(Sq.fn("concat", Sq.col("student_first_name"), " ", Sq.col("student_last_name")), { [Sq.Op.iLike]: `%${search}%` }),

                Sq.where(Sq.fn("LOWER", Sq.fn('PGP_SYM_DECRYPT', Sq.col("student_email"), PG_ENCRYPT_KEY)), "LIKE", search.toLowerCase()),

            ],
        };
    }

    if (sort && order) {

        query_data.order = [[sort, order]]

    };
    if (page && limit) {

        query_data.offset = 0 + (page - 1) * limit;
        query_data.limit = limit;

    };
    if (search) {
        where_data = {
            where_data,
            [Sq.Op.or]: [
                //check the first name or last name with case insensitivity
                Sq.where(Sq.fn("concat", Sq.col("student_first_name"), " ", Sq.col("student_last_name")), { [Sq.Op.iLike]: `%${search}%` }),

                Sq.where(Sq.fn("LOWER", Sq.fn('PGP_SYM_DECRYPT', Sq.col("student_email"), PG_ENCRYPT_KEY)), "LIKE", search.toLowerCase()),

            ],
        };
    }
    const BssSchoolDetailsModel = await BssSchoolDetails(config_sequelize);
    const BssStudentsModel = await BssStudents(config_sequelize);
    const BssDormitoriesModel = await BssDormitories(config_sequelize);
    BssStudentsModel.findAndCountAll({
        where: where_data,
        attributes: [
            "student_first_name", "student_last_name", "class_name", "student_avatar",
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col("date_of_birth"), PG_ENCRYPT_KEY), "date_of_birth"],
            [Sq.col("student_school_data.school_name"), "school_name"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col("dormitory_data.dormitory_name"), PG_ENCRYPT_KEY), "dormitory_name"],
            [Sq.fn("concat", Sq.col("student_school_data.school_code"), Sq.col("student_id")), "id_card_code"]
        ],

        include: [
            {
                model: BssSchoolDetailsModel, as: "student_school_data",
                attributes: [],

            },
            {
                model: BssDormitoriesModel, as: "dormitory_data",
                attributes: []
            },
        ],

        ...query_data, hooks: false, raw: true

    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get all Student details for Id Card successfully! "

        });

    }).catch((error) => {

        console.log(error);
        return res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });

    });

};
module.exports.GetAllStudentCountForChart = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const { class_id, search, dormitory_id, gender, student_age, is_student_activate } = req.query;

    let where_data = {};

    if (gender) {
        where_data = {
            ...where_data,
            gender: gender
        }
    };
    if (dormitory_id) {
        where_data = {
            ...where_data,
            dormitory_id: dormitory_id
        }

    };
    if (is_student_activate === "true" || is_student_activate === true) {
        where_data = {
            ...where_data,
            is_student_activate: true
        }

    };
    if (is_student_activate === "false" || is_student_activate === false) {
        where_data = {
            ...where_data,
            is_student_activate: false
        }
    };
    if (class_id) {
        where_data = {
            ...where_data,
            class_id: class_id
        }

    };
    if (student_age) {
        where_data = {
            ...where_data,
            student_age: student_age
        }
    };

    if (search) {
        where_data = {
            ...where_data,
            [Sq.Op.or]: [
                //check the first name or last name with case insensitivity
                Sq.where(Sq.fn("concat", Sq.col("student_first_name"), " ", Sq.col("student_last_name")), { [Sq.Op.iLike]: `%${search}%` }),

                Sq.where(Sq.fn("LOWER", Sq.fn('PGP_SYM_DECRYPT', Sq.col("student_email"), PG_ENCRYPT_KEY)), "LIKE", search.toLowerCase()),

            ],
        };
    };
    const BssStudentsModel = await BssStudents(config_sequelize);
    BssStudentsModel.findAll({
        where: where_data,
        attributes: ['gender',
            [Sq.fn('COUNT', Sq.col('gender'),), 'count',]],
        group: 'gender',
        raw: true,
        hooks: false
    }).then((response) => {

        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get all Student Count details successfully! "
        });

    }).catch((error) => {
        console.log(error);
        return res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });
    });
};


//student leave deatils delete pending
module.exports.DeleteStudent = async (req, res) => {
    try {
        const login_user = req.login_user;
        const config_sequelize = req.config_sequelize;

        const { student_id, parent_id } = req.body;
        console.log("----------------------------------------------", req.body)
        const BssStudentsModel = await BssStudents(config_sequelize);
        const BssParentsModel = await BssParents(config_sequelize);
        const BssParentAddressModel = await BssParentAddress(config_sequelize);
        const BssStudentHostModel = await BssStudentHost(config_sequelize);
        const BssStudentGenericModel = await BssStudentGeneric(config_sequelize);
        const BssStuCurrrentLocationModel = await BssStuCurrrentLocation(config_sequelize);
        const BssStudentGroundedModel = await BssStudentGrounded(config_sequelize);
        const BssStudentAllergyModel = await BssStudentAllergy(config_sequelize);
        const BssStudentAttendanceModel = await BssStudentAttendance(config_sequelize);
        const BssDiaryCommentsModel = await BssDiaryComments(config_sequelize);
        const BssStuLocChangeNotificationsModel = await BssStuLocChangeNotifications(config_sequelize);

        const studentRes = await BssStudentsModel.findAll({ where: { parent_id } });
        console.log(":::::::::::::::::::::::::::::::::::::;;", studentRes)
        if (studentRes && studentRes.length < 2) {
            await BssParentsModel.destroy({ where: { parent_id } });
            await BssParentAddressModel.destroy({ where: { parent_id } });

            let sys_obj = {
                user_id: login_user.user_id,
                action: "deleted",
                html_info: `<strong>${studentRes[0].student_first_name} ${studentRes[0].student_last_name} </strong> was deleted from boading system by ${login_user.first_name} ${login_user.last_name}. All information about the student was delete from system !`
            }
            SystemLogsFun(sys_obj, config_sequelize)
        };
        await BssStudentsModel.destroy({ where: { student_id } });
        await BssStudentHostModel.destroy({ where: { student_id } });
        await BssStudentGenericModel.destroy({ where: { student_id } });
        await BssStudentAllergyModel.destroy({ where: { student_id } });
        await BssStuCurrrentLocationModel.destroy({ where: { student_id } });
        await BssStudentAttendanceModel.destroy({ where: { student_id } });
        await BssStuLocChangeNotificationsModel.destroy({ where: { student_id } });
        await BssDiaryCommentsModel.destroy({ where: { student_id } });
        await BssStudentGroundedModel.destroy({ where: { student_id } });

        res.json({
            status: 200,
            success: true,
            message: "Student deleted successfully!"
        });

    } catch (error) {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Someting went wrong.Please try again or reach out to support if the issue persists."
        });

    };
};

// module.exports.GetAllStudents = async (req, res) => {
//     const config_sequelize = req.config_sequelize;
//     const login_user = req.login_user;

//     const BssDormitoriesModel = await BssDormitories(config_sequelize)
//     const BssClssesModel = await BssClasses(config_sequelize)
//     const studentModel = await BssStudents(config_sequelize)
//     const BssParentsModel = await BssParents(config_sequelize);

//     studentModel.hasOne(await BssClssesModel,
//         {
//             as: "class_details", foreignKey: "class_id", sourceKey: "class_id",
//         });

//     studentModel.findAndCountAll({

//         // [Sq.fn('PGP_SYM_DECRYPT',Sq.col("student_username"),PG_ENCRYPT_KEY),"student_username"],
//         attributes: [
//             [Sq.fn('PGP_SYM_DECRYPT', Sq.col('dormitory_name'), PG_ENCRYPT_KEY), "dormitory_name"],
//             [Sq.fn('PGP_SYM_DECRYPT', Sq.col('student_username'), PG_ENCRYPT_KEY), "student_username"],

//             'student_id', 'student_first_name', 'gender', 'class_id', "first_point_contact",],

//         include: [
//             {
//                 model: BssParentsModel, as: 'parent_data',
//                 attributes: [[Sq.fn('PGP_SYM_DECRYPT', Sq.col('father_username'), PG_ENCRYPT_KEY), "father_username"],
//                 [Sq.fn('PGP_SYM_DECRYPT', Sq.col('mother_username'), PG_ENCRYPT_KEY), "mother_username"],]
//             },
//             {
//                 model: BssDormitoriesModel, as: 'dormitory_data',
//                 attributes: ['dormitory_name'],
//             },
//             {
//                 model: BssClssesModel, as: 'class_details',
//                 attributes: ['class_name']

//             }
//         ]
//     }).then((response) => {
//         res.json({
//             status: 200,
//             success: true,
//             data: response,
//             message: "data Fatched Successfully"
//         })
//     }).catch((error) => {

//         res.json({
//             status: 400,
//             success: false,
//             error: error,
//             message: "Someting went wrong.Please try again or reach out to support if the issue persists!"
//         })
//     })
// }

module.exports.GetAllManagers = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;

    const BssUserModel = await BssUsers(config_sequelize)
    BssUserModel.findAndCountAll().then(async (response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "All manager Fatched successfully"
        })
    }).catch((error) => {
        res.json({
            status: 400,
            success: false,
            message: "Someting went wrong.Please try again or reach out to support if the issue persists"
        })
    })

}

module.exports.updateManagerStatus = async (req, res) => {
    const login_user = req.login_user
    const config_sequelize = req.config_sequelize
    const { is_user_active } = req.body

    const BssUsersModel = await BssUsers(config_sequelize)
    await BssUsersModel.update({ is_user_active }, { where: { user_uuid } }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "manager status updated successfully"
        })
    }).catch((error) => {
        console.log("error", error)
        res.json({
            status: 400,
            error: error.message,
            success: false,
            message: `something went wrong please try again or reach out to support if the issue persists`
        })
    })
}




//editd

//  module.exports.CreateStudentGrounded = async (req, res) => {
//     try {
//         const config_sequelize = req.config_sequelize;
//         const school_code = req.headers.school_code;
//         const login_user = req.login_user;
//         const student_grounded_details = req.body;
//         const { grounded_start_date, grounded_end_date, student_ids,student_names, grounded_desc, school_name } = student_grounded_details;
//         student_grounded_details.created_by = login_user.user_id;

//         const BssStudentGroundedModel = await BssStudentGrounded(config_sequelize);
//         const BssStudentModel = await BssStudents(config_sequelize);

//         const groundedStudents = [];

//         for (const val of student_ids) {
//             student_grounded_details.student_id = val;
//             delete student_grounded_details.student_ids;

//             const existingGroundedStudent = await BssStudentGroundedModel.findOne({
//                         where: {
//                             [Sq.Op.and]:
//                                 [
//                                     { grounded_start_date: { [Sq.Op.lte]: moment(grounded_start_date).format("YYYY-MM-DD") } },
//                                     { grounded_end_date: { [Sq.Op.gte]: moment(grounded_end_date).format("YYYY-MM-DD") } }
//                                 ],
//                             student_id:val
//                         }
//                     })
//         if (existingGroundedStudent) {
//             groundedStudents.push(val);
//         } else {
//                 const response = await BssStudentGroundedModel.create(student_grounded_details);
//     if (response.grounded_mail_parent === true || response.grounded_mail_student === true ||
//         response.grounded_mail_parent === "true" || response.grounded_mail_student === "true") {

//         const BssStudentModel = await BssStudents(config_sequelize);
//         const BssParentsModel = await BssParents(config_sequelize);

//         // try {
//             const studentResponse = await BssStudentModel.findOne({
//                 where: { student_id: response.student_id },
//                 attributes: ["student_uuid", "student_id", "student_first_name", "student_last_name",
//                     [Sq.fn('PGP_SYM_DECRYPT', Sq.col('student_email'), PG_ENCRYPT_KEY), "student_email"],
//                 ],
//                 include: {
//                     model: BssParentsModel, as: "parent_data",
//                     attributes: ["parent_id", "father_name", "mother_name", [Sq.fn('PGP_SYM_DECRYPT', Sq.col('father_email'), PG_ENCRYPT_KEY), "father_email"],
//                         [Sq.fn('PGP_SYM_DECRYPT', Sq.col('mother_email'), PG_ENCRYPT_KEY), "mother_email"],
//                     ]
//                 },
//                 hooks: false
//             })

//             /************* System Email Start for send login info **********************/
//             let emailDetails = [];

//             if (response.grounded_mail_student === true || response.grounded_mail_student === "true") {
//                 emailDetails.push({
//                     email_student_name: studentResponse.student_first_name + " " + studentResponse.student_last_name,
//                     email_address: studentResponse.student_email,
//                     email_parent_name: "",
//                     email_grounded_start_date: response.grounded_start_date,
//                     email_grounded_end_date: response.grounded_end_date,
//                     email_template_name: "StudentGroundedInfo.html",
//                     email_grounded_desc: response.grounded_desc,
//                     email_subject: "Student Gronded!",
//                 })
//             }

//             if (response.grounded_mail_parent === "true" || response.grounded_mail_parent === true) {
//                 emailDetails.push({
//                     email_parent_name: studentResponse.first_point_email === "m" ? + studentResponse.parent_data.mother_name : studentResponse.parent_data.father_name,
//                     email_address: studentResponse.first_point_email === "m" ? + studentResponse.parent_data.father_email : studentResponse.parent_data.mother_email,
//                     email_student_name: studentResponse.student_first_name + " " + studentResponse.student_last_name,
//                     email_grounded_start_date: response.grounded_start_date,
//                     email_grounded_end_date: response.grounded_end_date,
//                     email_template_name: "StudentGroundedParentInfo.html",
//                     email_grounded_desc: response.grounded_desc,
//                     email_subject: "Student Gronded!",
//                 }
//                 )
//             }

//             emailDetails.forEach((emailValues) => {
//                 let email_parametars = {
//                     email_student_name: emailValues.email_student_name,
//                     email_parent_name: emailValues.email_parent_name,
//                     email_address: emailValues.email_address,
//                     email_template_name: emailValues.email_template_name,
//                     email_grounded_desc: emailValues.email_grounded_desc,
//                     email_grounded_start_date: emailValues.email_grounded_start_date,
//                     email_grounded_end_date: emailValues.email_grounded_end_date,
//                     school_code: school_code,
//                     school_name: school_name,
//                     email_subject: emailValues.email_subject,
//                     APP_URL: process.env.APP_URL,
//                 };
//                 let email_template = fs.readFileSync(appRoot + `/src/Services/Views/email-templates/${emailValues.email_template_name}`, "utf8");

//                 email_template = email_template.replace(/email_student_name|email_parent_name|email_address|email_grounded_desc|email_grounded_start_date|email_grounded_end_date|school_code|school_name|APP_URL/gi, function (matched) {
//                     return email_parametars[matched];
//                 });
//                 let mailOptions = {
//                     from: process.env.MAIL_FROM_ADDRESS,
//                     to: emailValues.email_address,
//                     subject: `BSS -${emailValues.email_subject}`,
//                     html: email_template,
//                 };
//                 // console.log("::::::::::::::::::::::;;",mailOptions)
//                 SendEmail(mailOptions)
//                     .then((info) => {
//                         console.log("Nodemailer Email sent-------------------", info.response);
//                     })
//                     .catch((error) => {
//                         console.log("Nodemailer error ----------------", error);
//                     });
//             })

//             }
//             }

//             var studentNames = student_names.map(student => `${student}`).join(', ');
//         }
//         const errorMessages = groundedStudents.map(studentId => `${studentId} already grounded between this Date Range!`);
//         if (errorMessages.length > 0) {
//             return res.json({
//                 status:400,
//                 success: false,
//                 message: errorMessages
//             });
//         }

//         let sys_obj = {
//             user_id: login_user.user_id,
//             action: "created",
//             html_info: `${login_user.first_name} ${login_user.last_name} enrolled <strong> ${studentNames} </strong> with an  grounded comment[${grounded_desc}] from ${grounded_start_date} to ${grounded_end_date} on boarding system !`
//         }
//         SystemLogsFun(sys_obj, config_sequelize)
//         return res.json({
//             status:200,
//             success:true,
//             message:"Student Grounded successfully!"
//         });
//     } catch (error) {
//         console.error(error);
//         return res.json({
//             status:400,
//             success: false,
//             message: "Something went wrong. Please try again or reach out to support if the issue persists."
//         });
//     }
// };

    module.exports.CreateStudentGrounded = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;
        const school_code = req.headers.school_code;
        const login_user = req.login_user;
        const student_grounded_details = req.body;
        const { grounded_start_date, grounded_end_date, student_ids,grounded_desc, school_name } = student_grounded_details;
        student_grounded_details.created_by = login_user.user_id;

        const BssStudentGroundedModel = await BssStudentGrounded(config_sequelize);
        const BssStudentModel = await BssStudents(config_sequelize);

        const alreadyGroundedStudents = [];
        const groundedStudents = []

        for (const val of student_ids) {
            const existingGroundedStudent = await BssStudentGroundedModel.findOne({
                where: {
                    [Sq.Op.and]:
                        [
                            { grounded_start_date: { [Sq.Op.lte]: moment(grounded_start_date).format("YYYY-MM-DD") } },
                            { grounded_end_date: { [Sq.Op.gte]: moment(grounded_end_date).format("YYYY-MM-DD") } }
                        ],
                    student_id: val
                }
            })
            // console.log("existingGroundedStudent",existingGroundedStudent)
            if (existingGroundedStudent) {
                const StudentResponse = await BssStudentModel.findOne({ where: { student_id: val }, attributes: [[Sq.fn("concat", Sq.col("student_first_name"), " ", Sq.col("student_last_name")), "student_name"]] })
                alreadyGroundedStudents.push(StudentResponse.dataValues.student_name);
            }
        }
        var errorMessages = alreadyGroundedStudents.map(alreadyGroundedStudentName => `${alreadyGroundedStudentName}`).join(',')
        if (errorMessages.length > 0) {
            return res.json({
                status: 400,
                success: false,
                message: `The student “${errorMessages} ” is already listed as grounded in the system. Please remove this student from the selecting list of grounded students before adding other students.`
            });
        }

    
        for (const val of student_ids) {
            student_grounded_details.student_id = val;

            const response = await BssStudentGroundedModel.create(student_grounded_details,);
            const BssStudentModel = await BssStudents(config_sequelize);
            const BssParentsModel = await BssParents(config_sequelize);

            // try {
            const studentResponse = await BssStudentModel.findOne({
                where: { student_id: response.student_id },
                attributes: ["student_uuid", "student_id", "student_first_name", "student_last_name",
                    [Sq.fn('PGP_SYM_DECRYPT', Sq.col('student_email'), PG_ENCRYPT_KEY), "student_email"],
                ],
                include: {
                    model: BssParentsModel, as: "parent_data",
                    attributes: ["parent_id", "father_name", "mother_name", [Sq.fn('PGP_SYM_DECRYPT', Sq.col('father_email'), PG_ENCRYPT_KEY), "father_email"],
                        [Sq.fn('PGP_SYM_DECRYPT', Sq.col('mother_email'), PG_ENCRYPT_KEY), "mother_email"],
                    ]
                },
                hooks: false
            })

            groundedStudents.push(`${studentResponse.student_first_name} ${studentResponse.student_last_name}`)
            console.log("::::::::::::;;",groundedStudents)
            
            if (response.grounded_mail_parent === true || response.grounded_mail_student === true ||
                response.grounded_mail_parent === "true" || response.grounded_mail_student === "true") {
                /************* System Email Start for send login info **********************/
                let emailDetails = [];

                if (response.grounded_mail_student === true || response.grounded_mail_student === "true") {
                    emailDetails.push({
                        email_student_name: studentResponse.student_first_name + " " + studentResponse.student_last_name,
                        email_address: studentResponse.student_email,
                        email_parent_name: "",
                        email_grounded_start_date: response.grounded_start_date,
                        email_grounded_end_date: response.grounded_end_date,
                        email_template_name: "StudentGroundedInfo.html",
                        email_grounded_desc: response.grounded_desc,
                        email_subject: "Student Gronded!",
                    })
                }
                if (response.grounded_mail_parent === "true" || response.grounded_mail_parent === true) {
                    emailDetails.push({
                        email_parent_name: studentResponse.first_point_email === "m" ? + studentResponse.parent_data.mother_name : studentResponse.parent_data.father_name,
                        email_address: studentResponse.first_point_email === "m" ? + studentResponse.parent_data.father_email : studentResponse.parent_data.mother_email,
                        email_student_name: studentResponse.student_first_name + " " + studentResponse.student_last_name,
                        email_grounded_start_date: response.grounded_start_date,
                        email_grounded_end_date: response.grounded_end_date,
                        email_template_name: "StudentGroundedParentInfo.html",
                        email_grounded_desc: response.grounded_desc,
                        email_subject: "Student Gronded!",
                    }
                    )
                }

                emailDetails.forEach((emailValues) => {
                    let email_parametars = {
                        email_student_name: emailValues.email_student_name,
                        email_parent_name: emailValues.email_parent_name,
                        email_address: emailValues.email_address,
                        email_template_name: emailValues.email_template_name,
                        email_grounded_desc: emailValues.email_grounded_desc,
                        email_grounded_start_date: emailValues.email_grounded_start_date,
                        email_grounded_end_date: emailValues.email_grounded_end_date,
                        school_code: school_code,
                        school_name: school_name,
                        email_subject: emailValues.email_subject,
                        APP_URL: process.env.APP_URL,
                    };
                    let email_template = fs.readFileSync(appRoot + `/src/Services/Views/email-templates/${emailValues.email_template_name}`, "utf8");

                    email_template = email_template.replace(/email_student_name|email_parent_name|email_address|email_grounded_desc|email_grounded_start_date|email_grounded_end_date|school_code|school_name|APP_URL/gi, function (matched) {
                        return email_parametars[matched];
                    });
                    let mailOptions = {
                        from: process.env.MAIL_FROM_ADDRESS,
                        to: emailValues.email_address,
                        subject: `BSS -${emailValues.email_subject}`,
                        html: email_template,
                    };
                    SendEmail(mailOptions)
                        .then((info) => {
                            console.log("Nodemailer Email sent-------------------", info.response);
                        })
                        .catch((error) => {
                            console.log("Nodemailer error ----------------", error);
                        });
                })

            }
       

        }
    
        if (groundedStudents.length > 0) {
            var studentNames = groundedStudents.map(studentNames => `${studentNames}`).join(', ');
            // console.log(studentNames)
        }

        let sys_obj = {
            user_id: login_user.user_id,
            action: "created",
            html_info: `${login_user.first_name} ${login_user.last_name} enrolled <strong> ${studentNames} </strong> with an  grounded comment "${grounded_desc}" from ${grounded_start_date} to ${grounded_end_date} on boarding system !`
        }
        console.log("::::::::::::::::::::",sys_obj)
    
        SystemLogsFun(sys_obj, config_sequelize)
        return res.json({
            status: 200,
            success: true,
            message: "Student Grounded successfully!"
        });
    } catch (error) {
        console.error(error);
        return res.json({
            status: 400,
            success: false,
            error: error.message,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });
    }
};






