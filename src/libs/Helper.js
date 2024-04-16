const nodemailer = require("nodemailer");
const fs = require("fs");
const Sq = require("sequelize");
const genPassword = require("secure-random-password");
const upload_folderpath = "uploads/";
const {BssSystemLogs} =require('../Services/Models/common');


(() => {
    /*** this function will create 'temp' folder if it doesn't exists already */
    fs.access(upload_folderpath, function (error) {
        if (error) {
            /*** folder doesn't exists, creating now. */
            fs.mkdir(upload_folderpath, (error) => {
                if (error) {
                    return console.error(error);
                }
                console.log("Directory created successfully!");
            });
        }
    });
})();

module.exports.DeleteFile = async (filepath) => {
    if (filepath) {
        // console.log("DeleteFile filepath------------", filepath);
        fs.access(filepath, fs.constants.F_OK | fs.constants.W_OK, (err) => {
            if (!err) {
                fs.unlink(filepath, function (error) {
                    if (error) {
                        console.log("DeleteFile error---------", error);
                    } else {
                        console.log("DeleteFile file deleted successfully");
                    }
                });
            }
        });
    }
};

module.exports.SendEmail = async (mailOptions) => {
    return new Promise((resolve, reject) => {
        let transporter = nodemailer.createTransport({
            // secure: false,
            tls: { rejectUnauthorized: false },
            port: process.env.MAIL_PORT,
            host: process.env.MAIL_HOST,
            auth: {
                user: process.env.MAIL_USERNAME,
                pass: process.env.MAIL_PASSWORD,
            },
        });
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                reject(error);
            } else {
                resolve(info);
            }
        });
    });
};
module.exports.generatePassword = async () => {
    let password = genPassword.randomPassword({ length: 8, characters: genPassword.lower + genPassword.upper + genPassword.digits });
    return password;
};


module.exports.convert_key_array = (array_objects, object_key) => {
    let custom_array = {};
    for (let key in array_objects) {
        let array_object = array_objects[key];
        if (Array.isArray(array_object)) {
            let new_key = array_object[object_key];
            if (typeof custom_array[array_object[object_key]] === "undefined") {
                custom_array[new_key] = [];
            }
            custom_array[new_key].push(array_object);

        } else {
            custom_array[array_object[object_key]] = array_object;

        }
    }
    // console.log("----------------",custom_array)
    return custom_array;
}
module.exports.StudentsCsvAttributes = async (req, res) => {

    return {
        attributes: [
            // ['unique_pin', "Unique Id"],
            ['student_first_name', "First Name"],
            ['student_last_name', "Last Name"],
            ['preferred_name', "preferred Name"],
            ['student_age', "Age"],
            ['class_name', "Class Name"],
            ['gender', 'Gender'],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('unique_pin'), PG_ENCRYPT_KEY), "Unique Id"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('student_email'), PG_ENCRYPT_KEY), "Email"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('date_of_birth'), PG_ENCRYPT_KEY), "Date Of Birth"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('campus_name'), PG_ENCRYPT_KEY), "Campus Name"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('sporting_house'), PG_ENCRYPT_KEY), "Sporting House"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('laundry_number'), PG_ENCRYPT_KEY), "Laundry Number"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('tutor_name'), PG_ENCRYPT_KEY), "Tutor Name"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('tutor_email'), PG_ENCRYPT_KEY), "Tutor Email"],

            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('kiosk_mode_pin'), PG_ENCRYPT_KEY), "Kiosk Mode Pin"],
            [Sq.col('parent_data.father_name'), "Father Name"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('parent_data.father_email'), PG_ENCRYPT_KEY), "Father Email"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('parent_data.father_phone'), PG_ENCRYPT_KEY), "Father Phone"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('parent_data.father_home_phone'), PG_ENCRYPT_KEY), "Father Home Phone"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('parent_data.father_work_phone'), PG_ENCRYPT_KEY), "Father Work Phone"],
            [Sq.col('parent_data.mother_name'), "Mother Name"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('parent_data.mother_email'), PG_ENCRYPT_KEY), "Mother Email"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('parent_data.mother_phone'), PG_ENCRYPT_KEY), "Mother Phone"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('parent_data.mother_home_phone'), PG_ENCRYPT_KEY), "Mother Home Phone"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('parent_data.mother_work_phone'), PG_ENCRYPT_KEY), "Mother Work Phone"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('parent_data.salutation'), PG_ENCRYPT_KEY), "Salutation"]

        ]
    };
};

module.exports.getAge = async (dateString) => {
    var today = new Date();
    var birthDate = new Date(dateString);
    var age = today.getFullYear() - birthDate.getFullYear();
    var m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

module.exports.SystemLogsFun = async (sys_obj, config_sequelize) => {
    try {
        const BssSystemLogsModel =await BssSystemLogs(config_sequelize)
        const result = await BssSystemLogsModel.create(sys_obj)
       return true
    } catch (e) {
        console.log("eeee", e);
    }

}