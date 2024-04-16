const BssParents = require("./BssParents");
const BssStudentAllergy = require("./BssStudentAllergy");
const BssDormitories = require("./BssDormitories");
const BssUsers = require("./BssUsers");
const BssSchoolDetails = require("./BssSchoolDetails");
const BssStudentAttendance = require("./BssStudentAttendance");
const BssStuReasonOncampus = require("./BssStuReasonOncampus");
const BssStudentGeneric = require("./BssStudentGeneric");
const BssStuCurrrentLocation = require("./BssStuCurrentLocation");
const BssStudentHost = require("./BssStudentHost");
const BssHost = require("./BssHost");


module.exports = async (sequelize2) => {
    const Sq = require("sequelize");

    const BssStudents = sequelize2.define("bss_students", {

        student_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        student_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal("uuid_generate_v4()"),
        },

        parent_id: Sq.INTEGER,
        school_detail_id: Sq.INTEGER,
        student_first_name: { type: Sq.STRING(255), allowNull: false },
        student_last_name: Sq.STRING(255),
        preferred_name: { type: Sq.STRING(255), allowNull: false },
        student_avatar: Sq.TEXT,
        student_email: { type: Sq.STRING.BINARY, allowNull: false, },
        student_phone: { type: Sq.STRING.BINARY, allowNull: false, },
        student_username: { type: Sq.STRING.BINARY, allowNull: false },
        student_password: Sq.STRING,
        unique_pin: { type: Sq.STRING.BINARY, allowNull: false },

        gender: {
            type: Sq.ENUM, values: ['male', 'female',],
            allowNull: false
        },

        is_student_activate: { type: Sq.BOOLEAN, defaultValue: true },
        class_name: Sq.STRING(50),
        class_id: { type: Sq.INTEGER, allowNull: false, },
        campus_name: { type: Sq.STRING.BINARY, allowNull: false },
        dormitory_id: { type: Sq.INTEGER, allowNull: false, },
        user_id: { type: Sq.INTEGER, },
        sporting_house: { type: Sq.STRING.BINARY, allowNull: false },
        laundry_number: { type: Sq.STRING.BINARY, allowNull: false },
        tutor_name: { type: Sq.STRING.BINARY, allowNull: false },
        tutor_email: { type: Sq.STRING.BINARY, allowNull: false },
        student_age: { type: Sq.INTEGER, allowNull: false },
        date_of_birth: { type: Sq.STRING.BINARY, allowNull: false },
        kiosk_mode_pin: { type: Sq.STRING.BINARY, allowNull: false },

        first_point_contact: {
            type: Sq.ENUM, values: ['f', 'm',],
            defaultValue: "f"
            // allowNull: false
        },
        first_point_email: {
            type: Sq.ENUM, values: ['f', 'm',],
            defaultValue: "f"
            // allowNull: false
        },

        display_image_required: { type: Sq.BOOLEAN, defaultValue: false },
        student_allergy_status: { type: Sq.STRING.BINARY, allowNull: false },
        show_parent_detail_app: { type: Sq.BOOLEAN, defaultValue: false },
        exclude_automatic_host: { type: Sq.BOOLEAN, defaultValue: false },
        allergy_unauth_access: { type: Sq.STRING.BINARY, allowNull: false },
        withdraw_leave: { type: Sq.BOOLEAN, defaultValue: false },
        permitted_student_app_signout: { type: Sq.BOOLEAN, defaultValue: false },
        is_duplicate: { type: Sq.BOOLEAN, defaultValue: false },
        rollcall_compare_status: { type: Sq.BOOLEAN,allowNull:false, defaultValue: false },
        device_token: { type: Sq.STRING(255), },
        device_name: { type: Sq.TEXT },

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
            defaultScope: {
                attributes: { exclude: ["student_password", "student_username"] },
            },
            scopes: {
                withPassword: { attributes: {} },
            },

        }
    )

    BssStudents.beforeCreate(async (bssStudents, options) => {
         const student_phone =bssStudents?.student_phone;
        bssStudents.student_email = Sq.fn("PGP_SYM_ENCRYPT ", bssStudents.student_email, PG_ENCRYPT_KEY);
        bssStudents.student_phone = Sq.fn("PGP_SYM_ENCRYPT ", student_phone ? student_phone : "", PG_ENCRYPT_KEY);
        bssStudents.campus_name = Sq.fn("PGP_SYM_ENCRYPT ", bssStudents?.campus_name ? bssStudents.campus_name : "", PG_ENCRYPT_KEY);
        bssStudents.sporting_house = Sq.fn("PGP_SYM_ENCRYPT ", bssStudents?.sporting_house ? bssStudents.sporting_house : "", PG_ENCRYPT_KEY);
        bssStudents.laundry_number = Sq.fn("PGP_SYM_ENCRYPT ", bssStudents?.laundry_number ? bssStudents.laundry_number : "", PG_ENCRYPT_KEY);
        bssStudents.tutor_name = Sq.fn("PGP_SYM_ENCRYPT ", bssStudents.tutor_name, PG_ENCRYPT_KEY);
        bssStudents.date_of_birth = Sq.fn("PGP_SYM_ENCRYPT ", bssStudents.date_of_birth, PG_ENCRYPT_KEY);
        bssStudents.allergy_unauth_access = Sq.fn("PGP_SYM_ENCRYPT ", bssStudents.allergy_unauth_access, PG_ENCRYPT_KEY);
        bssStudents.student_allergy_status = Sq.fn("PGP_SYM_ENCRYPT ", bssStudents.student_allergy_status, PG_ENCRYPT_KEY);
        bssStudents.tutor_email = Sq.fn("PGP_SYM_ENCRYPT ", bssStudents?.tutor_email ? bssStudents.tutor_email : "", PG_ENCRYPT_KEY);
        bssStudents.kiosk_mode_pin = Sq.fn("PGP_SYM_ENCRYPT ", bssStudents.kiosk_mode_pin, PG_ENCRYPT_KEY);

    });
    BssStudents.beforeUpdate(async (bssStudents, options) => {
        bssStudents.student_email = Sq.fn("PGP_SYM_ENCRYPT ", bssStudents.student_email, PG_ENCRYPT_KEY);
        bssStudents.student_phone = Sq.fn("PGP_SYM_ENCRYPT ", bssStudents.student_phone, PG_ENCRYPT_KEY);
        bssStudents.campus_name = Sq.fn("PGP_SYM_ENCRYPT ", bssStudents?.campus_name ? bssStudents.campus_name : "", PG_ENCRYPT_KEY);
        bssStudents.sporting_house = Sq.fn("PGP_SYM_ENCRYPT ", bssStudents?.sporting_house ? bssStudents.sporting_house : "", PG_ENCRYPT_KEY);
        bssStudents.laundry_number = Sq.fn("PGP_SYM_ENCRYPT ", bssStudents?.laundry_number ? bssStudents.laundry_number : "", PG_ENCRYPT_KEY);
        bssStudents.tutor_name = Sq.fn("PGP_SYM_ENCRYPT ", bssStudents.tutor_name, PG_ENCRYPT_KEY);
        bssStudents.date_of_birth = Sq.fn("PGP_SYM_ENCRYPT ", bssStudents.date_of_birth, PG_ENCRYPT_KEY);
        bssStudents.allergy_unauth_access = Sq.fn("PGP_SYM_ENCRYPT ", bssStudents.allergy_unauth_access, PG_ENCRYPT_KEY);
        bssStudents.student_allergy_status = Sq.fn("PGP_SYM_ENCRYPT ", bssStudents.student_allergy_status, PG_ENCRYPT_KEY);
        bssStudents.tutor_email = Sq.fn("PGP_SYM_ENCRYPT ", bssStudents?.tutor_email ? bssStudents.tutor_email : "", PG_ENCRYPT_KEY);
        bssStudents.kiosk_mode_pin = Sq.fn("PGP_SYM_ENCRYPT ", bssStudents.kiosk_mode_pin, PG_ENCRYPT_KEY);
        bssStudents?.student_username ? bssStudents.student_username = Sq.fn("PGP_SYM_ENCRYPT ", bssStudents.student_username, PG_ENCRYPT_KEY) : ""

    });

    BssStudents.beforeFind(async (bssStudents, options) => {
        if (bssStudents?.attributes) {
            bssStudents.attributes.include = [
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('student_email'), PG_ENCRYPT_KEY), "student_email"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('student_phone'), PG_ENCRYPT_KEY), "student_phone"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('campus_name'), PG_ENCRYPT_KEY), "campus_name"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('sporting_house'), PG_ENCRYPT_KEY), "sporting_house"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('laundry_number'), PG_ENCRYPT_KEY), "laundry_number"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('tutor_name'), PG_ENCRYPT_KEY), "tutor_name"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('tutor_email'), PG_ENCRYPT_KEY), "tutor_email"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('date_of_birth'), PG_ENCRYPT_KEY), "date_of_birth"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('kiosk_mode_pin'), PG_ENCRYPT_KEY), "kiosk_mode_pin"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('student_allergy_status'), PG_ENCRYPT_KEY), "student_allergy_status"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('allergy_unauth_access'), PG_ENCRYPT_KEY), "allergy_unauth_access"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('unique_pin'), PG_ENCRYPT_KEY), "unique_pin"],
                [Sq.fn('PGP_SYM_DECRYPT', Sq.col('student_username'), PG_ENCRYPT_KEY), "student_username"]

            ]
        }
       
    });

    BssStudents.hasOne(await BssParents(sequelize2, Sq), {
        as: "parent_data", foreignKey: "parent_id", sourceKey: "parent_id",
        constraints: false, allowNull: true, defaultValue: null
    });

    BssStudents.hasMany(await BssStudentAllergy(sequelize2, Sq), {
        as: "allergy_details", foreignKey: "student_id",

    });
    BssStudents.hasOne(await BssDormitories(sequelize2, Sq), {
        as: "dormitory_data", foreignKey: "dormitory_id", sourceKey: "dormitory_id"

    });
    BssStudents.hasOne(await BssUsers(sequelize2, Sq), {
        as: "manager_data", foreignKey: "user_id", sourceKey: "user_id"

    });
    BssStudents.belongsTo(await BssSchoolDetails(sequelize2, Sq), {
        as: "student_school_data", foreignKey: "school_detail_id", sourceKey: "school_detail_id"

    });
    BssStudents.hasOne(await BssStudentAttendance(sequelize2, Sq), {
        as: "student_attendance", foreignKey: "student_id",


    });
    BssStudents.hasMany(await BssStudentAttendance(sequelize2, Sq), {
        as: "stu_atten_details", foreignKey: "student_id",


    });
    BssStudents.hasOne(await BssStuReasonOncampus(sequelize2), {
        as: "oncampus_or_reason", foreignKey: "student_id",
        constraints: false, allowNull: true, defaultValue: null

    });
    BssStudents.hasMany(await BssStuReasonOncampus(sequelize2), {
        as: "campus_or_reasons_data", foreignKey: "student_id",

    });

    BssStudents.hasMany(await BssStudentGeneric(sequelize2), {
        as: "generic_data", foreignKey: "student_id",

    });
    BssStudents.hasOne(await BssStuCurrrentLocation(sequelize2),
        { as: "current_loc_data", foreignKey: "student_id", sourceKey: "student_id" })

    BssStudents.belongsToMany(await BssHost(sequelize2), {
        through: await BssStudentHost(sequelize2),
        as: 'stu_host_data',
        constraints: false,
        allowNull: true,
        defaultValue: null,
        foreignKey: 'student_id',
        otherKey: 'host_id'

    });


    return BssStudents;
}