const fs = require("fs");
const Sq = require("sequelize");
const { DateTime, } = require("luxon");
const PDFDocument = require("pdfkit-table");
const { DeleteFile,SystemLogsFun } = require("../../libs/Helper");

const { BssUsers, BssStudents, BssDormitories, BssOperationalComments, BssDiaryComments, BssClasses,
    BssAttendanceUsers, BssStudentAttendance, BssReasons, BssOnCampusLocations,BssAttendanceDiscarded } = require("../Models/common");
// const { response } = require("express");
// const { Json } = require("sequelize/types/utils");

//update the api date of birth pending
module.exports.GetStudentsBirthdayDetails = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const timezone = login_user.user_school.timezone
    const BssStudentsModel = await BssStudents(config_sequelize);
    const todayDate = DateTime.now().setZone(timezone).toFormat('MM-dd');

    BssStudentsModel.findAll({

        where: {
            date_of_birth: Sq.where(Sq.fn('PGP_SYM_DECRYPT', Sq.col('date_of_birth'),
                PG_ENCRYPT_KEY), "LIKE", "%" + todayDate)
        },

        attributes: ["student_uuid", "student_id", "student_first_name",
            "student_last_name", "class_name", [Sq.fn('PGP_SYM_DECRYPT', Sq.col('date_of_birth'),
                PG_ENCRYPT_KEY), "date_of_birth"]],
        hooks: false

    }).then((response) => {

        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Students Birthday Details successfully!"
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
module.exports.CreateOperationalComment = async (req, res) => {
    const login_user = req.login_user;
    const config_sequelize = req.config_sequelize;
    const operational_details = req.body;
    operational_details.created_by = login_user.user_id;

    const BssOperationalCommentsModel = await BssOperationalComments(config_sequelize);
    BssOperationalCommentsModel.create(operational_details).then(async(response) => {
        let sys_obj ={
            user_id:login_user.user_id,
            action:"created",
            html_info:`An <a href ="operational comment"> was added by <strong> ${login_user.first_name} ${login_user.last_name} </strong> !`
        }
    SystemLogsFun(sys_obj,config_sequelize)
        res.json({
            status: 200,
            success: true,
            message: "Operational Comment created successfully!"
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
module.exports.GetAllOperationalComments = async (req, res) => {
    const login_user = req.login_user;
    const { page, limit } = req.query;
    const config_sequelize = req.config_sequelize;

    let where_data = {};
    let query_data = {};


    if (page && limit) {
        query_data = {
            ...query_data,
            offset: 0 + (page - 1) * limit,
            limit: limit
        }
    }

    const BssOperationalCommentsModel = await BssOperationalComments(config_sequelize);
    BssOperationalCommentsModel.findAndCountAll({
        where: where_data, attributes: ["operational_comment_id",
            "operational_comment_uuid", "operational_desc"], ...query_data,
        order: [["operational_comment_id", "desc"]]
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get All Operational Comment's successfully!"
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

// module.exports.CreateDiaryMedicalComment = async (req, res) => {
//     const config_sequelize = req.config_sequelize;
//     const login_user = req.login_user;
//     const medical_comment_details = req.body;
//     medical_comment_details.created_by = login_user.user_id;

//     const BssDiaryCommentsModel = await BssDiaryComments(config_sequelize);
//     const BssStudentModel =await BssStudents(config_sequelize)
//     BssDiaryCommentsModel.create(medical_comment_details).then(async(response) => {
//     const student = await BssStudentModel.findOne({where:{student_id:medical_comment_details.student_id}})
//    const sys_obj={
//        user_id:login_user.user_id,
//        action:"created",
//        html_info:`A medical comment has been added on <strong> ${student.student_first_name} ${student.student_last_name} </strong> profile and medicine is ${medical_comment_details.is_med_issued=='true' ? 'issued' : 'not issued'} !`
//    }
//     SystemLogsFun(sys_obj,config_sequelize)
//         res.json({
//             status: 200,
//             success: true,
//             message: "Create Medical Comment successfully!"
//         });

//     }).catch((error) => {
//         console.log(error);
//         return res.json({
//             status: 400,
//             success: false,
//             error: error,
//             message: "Something went wrong. Please try again or reach out to support if the issue persists."
//         });

//     });

// };


module.exports.CreateDiaryMedicalComment = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const medical_comment_details = req.body;
    const {student_ids,student_names} =medical_comment_details
    medical_comment_details.created_by = login_user.user_id;

    //  student_ids = Json.parse(student_ids)
    //  student_names = Json.parse(student_names)

    const BssDiaryCommentsModel = await BssDiaryComments(config_sequelize);
    const BssStudentsModel =await BssStudents(config_sequelize)
    try{
    student_ids.forEach(stuId => {
        medical_comment_details.student_id =stuId
        delete medical_comment_details.student_ids
        delete medical_comment_details.student_names

    BssDiaryCommentsModel.create(medical_comment_details)

    })

    //save Logd in dataBsae
    var studentNames = student_names.map(studentNames => `${studentNames}`).join(', ');
       const sys_obj={
       user_id:login_user.user_id,
       action:"Medical Comment Added ",
       html_info:`A Medical Comment has been added on <strong> ${studentNames} </strong> Profile by ${login_user.first_name} ${login_user.last_name} and Medicine is ${medical_comment_details.is_med_issued=='true' ? 'issued' : 'not issued'} .`
   }


    SystemLogsFun(sys_obj,config_sequelize)
        res.json({
            status: 200,
            success: true,
            message: "Create Medical Comment successfully!"
        });

    }catch(error){
        console.log(error);
        return res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        });
    }
    
};
  

module.exports.GetAllDiaryMedicalComments = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const { timezone } = login_user.user_school;
    const { search, page, limit } = req.query;

    let inner_where_data = {};
    let query_data = {};

    if (search) {
        inner_where_data = {
            ...inner_where_data,
            [Sq.Op.or]: [
                //check the first name or last name with case insensitivity
                Sq.where(Sq.fn("concat", Sq.col("student_first_name"), " ", Sq.col("student_last_name")), { [Sq.Op.iLike]: `%${search}%` }),

            ],
        };
    }
    if (page && limit) {

        query_data.offset = 0 + (page - 1) * limit;
        query_data.limit = limit;

    };

    const BssDiaryCommentsModel = await BssDiaryComments(config_sequelize);
    const BssStudentsModel = await BssStudents(config_sequelize);
    BssDiaryCommentsModel.findAndCountAll({

        where: { diary_comment_type: "medical" },
        attributes: ["diary_comment_id", "diary_comment_uuid", "student_id", "diary_comment_desc",
            "diary_comment_type",
            [Sq.literal(`"bss_diary_comments"."created_date"::timestamptz AT TIME ZONE '${timezone}'`), 'created_date']],
        include: {
            model: BssStudentsModel, as: "comment_student_data",
            where: inner_where_data,
            attributes: ["student_uuid", "student_first_name", "student_last_name", "class_name"],

        },
        ...query_data,
        order: [["diary_comment_id", "desc"]]
    }).then((response) => {
        console.log(response)
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get All Medical Comment's successfully!"
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

module.exports.CreateDiaryPastoralComments = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const pastoral_comment_details = req.body;
    const { diary_comment_desc, diary_comment_type } = pastoral_comment_details;

    console.log(pastoral_comment_details)

    let student_ids = pastoral_comment_details.student_ids;
    // student_ids=JSON.parse(student_ids)
    const pastoral_comment_array = [];
    console.log("-------------------------------------------------",student_ids)

    for (let student_id of student_ids) {
        pastoral_comment_array.push({
            diary_comment_desc,
            diary_comment_type,
            created_by: login_user.user_id,
            student_id: student_id
        })
    }
    console.log(pastoral_comment_array)

    const BssDiaryCommentsModel = await BssDiaryComments(config_sequelize);
    const BssStudentModel =await BssStudents(config_sequelize)
    BssDiaryCommentsModel.bulkCreate(pastoral_comment_array).then(async(response) => {
        const student = await BssStudentModel.findAll({
            where:{
          student_id:{[Sq.Op.in]:student_ids}
            }     
        })
  
        for(let student_name of student){
        let sys_obj={
            user_id:login_user.user_id,
            action:"created",
            html_info:`A postoral comment has been added on <strong> ${student_name.student_first_name} ${student_name.student_last_name} </strong> profile !`
        }
    
         SystemLogsFun(sys_obj,config_sequelize)
    }
        res.json({
            status: 200,
            success: true,
            message: "Create Medical Comment successfully!"
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

module.exports.GetAllDiaryPastoralComments = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const { search, page, limit } = req.query;
    const { timezone } = login_user.user_school;

    let inner_where_data = {};
    const query_data = {};

    if (search) {
        inner_where_data = {
            ...inner_where_data,
            [Sq.Op.or]: [
                //check the first name or last name with case insensitivity
                Sq.where(Sq.fn("concat", Sq.col("student_first_name"), " ", Sq.col("student_last_name")), { [Sq.Op.iLike]: `%${search}%` }),

            ],
        };
    }
    if (page && limit) {

        query_data.offset = 0 + (page - 1) * limit;
        query_data.limit = limit;

    };
    const BssStudentsModel = await BssStudents(config_sequelize);
    const BssDiaryCommentsModel = await BssDiaryComments(config_sequelize);
    BssDiaryCommentsModel.findAndCountAll({
        where: { diary_comment_type: "pastoral" },
        attributes: ["diary_comment_id", "diary_comment_uuid", "student_id", "diary_comment_desc",
            "diary_comment_type",
            [Sq.literal(`"bss_diary_comments"."created_date"::timestamptz AT TIME ZONE '${timezone}'`), 'created_date']
        ],
        include: {
            model: BssStudentsModel, as: "comment_student_data",
            where: inner_where_data,
            attributes: ["student_uuid", "student_first_name", "student_last_name", "class_name"],
            // required: false
        },
        ...query_data,
        order: [["diary_comment_id", "desc"]]
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get All Pastoral Comment's successfully!"
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
module.exports.GetAllStudentListForDiaryComments = async (req, res) => {
    const config_sequelize = req.config_sequelize;

    const BssStudentsModel = await BssStudents(config_sequelize);
    const BssDormitoriesModel = await BssDormitories(config_sequelize)
    BssStudentsModel.findAll({
        where: { is_student_activate: true },
        attributes: ["student_uuid", "student_id", "student_first_name",
            "student_last_name", "is_student_activate", "class_name"],
        include: {
            model: BssDormitoriesModel, as: "dormitory_data",
            attributes: [[Sq.fn("PGP_SYM_DECRYPT", Sq.col("dormitory_name"), PG_ENCRYPT_KEY), "dormitory_name"]]
        },
        order: [["student_first_name", "asc"]],
        hooks: false
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
module.exports.GetDashboardStudentsMedicalIssued = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    let { timezone } = login_user.user_school;
    let { start_date, end_date, dormitory_id, page, limit } = req.query;

    let where_data = { diary_comment_type: "medical", is_med_issued: true };
    let inner_where_data = {}
    let query_data = {};

    if (dormitory_id) {
        inner_where_data = {
            ...inner_where_data,
            dormitory_id
        }
    }
    if (start_date && end_date) {
        start_date = DateTime.fromFormat(start_date, "yyyy-MM-dd").startOf('day').toUTC().toISO();
        end_date = DateTime.fromFormat(end_date, "yyyy-MM-dd").endOf('day').toUTC().toISO();
        where_data = {
            ...where_data,
            created_date: {
                [Sq.Op.and]: {
                    [Sq.Op.gte]: start_date,
                    [Sq.Op.lte]: end_date
                }
            }
        }
    }
    if (page && limit) {
        query_data.offset = 0 + (page - 1) * limit;
    }

    const BssDiaryCommentsModel = await BssDiaryComments(config_sequelize);
    const BssStudentsModel = await BssStudents(config_sequelize);
    const BssUsersModel = await BssUsers(config_sequelize);


    BssDiaryCommentsModel.findAndCountAll({
        where: where_data,
        attributes: ["diary_comment_uuid", "diary_comment_desc", "diary_comment_type",
            [Sq.literal(`"bss_diary_comments"."created_date"::timestamptz AT TIME ZONE '${timezone}'`), 'created_date']
        ],

        include: [
            {
                model: BssStudentsModel, as: "comment_student_data",
                where: inner_where_data,
                attributes: ["student_uuid", "student_id", "student_first_name", "student_last_name",
                    [Sq.fn("PGP_SYM_DECRYPT", Sq.col("unique_pin"), PG_ENCRYPT_KEY), "unique_pin"]],
            },
            {
                model: BssUsersModel, as: "comment_by_user",
                attributes: ["user_id", "first_name", "last_name"]
            }
        ],
        ...query_data, order: [["diary_comment_id", "desc"]],
        hooks: false
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get All Medical Issued successfully!"
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

module.exports.ExportMedicalIssuedStudentsPdf = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    let { timezone, school_code } = login_user.user_school;
    let { start_date, end_date, dormitory_id, } = req.query;

    let where_data = { diary_comment_type: "medical", is_med_issued: true };
    let inner_where_data = {}
    let query_data = {};

    if (dormitory_id) {
        inner_where_data = {
            ...inner_where_data,
            dormitory_id
        }
    }
    if (start_date && end_date) {
        start_date = DateTime.fromFormat(start_date, "yyyy-MM-dd").startOf('day').toUTC().toISO();
        end_date = DateTime.fromFormat(end_date, "yyyy-MM-dd").endOf('day').toUTC().toISO();
        where_data = {
            ...where_data,
            created_date: {
                [Sq.Op.and]: {
                    [Sq.Op.gte]: start_date,
                    [Sq.Op.lte]: end_date
                }
            }
        }
        console.log(start_date)
    }

    const BssDiaryCommentsModel = await BssDiaryComments(config_sequelize, { timezone: timezone });
    const BssStudentsModel = await BssStudents(config_sequelize);
    const BssUsersModel = await BssUsers(config_sequelize);
    const BssDormitoriesModel = await BssDormitories(config_sequelize);

    // console.log(req.query)
    BssDiaryCommentsModel.findAll({
        where: where_data,
        attributes: ["diary_comment_uuid", "diary_comment_desc", "diary_comment_type", "created_date",
            "created_date_formated",
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('comment_student_data.unique_pin'), PG_ENCRYPT_KEY), "unique_pin"],
            [Sq.fn('concat', Sq.col("comment_student_data.student_first_name"), ' ', Sq.col("comment_student_data.student_last_name")), "stu_fullname"],
            [Sq.fn('PGP_SYM_DECRYPT', Sq.col('comment_student_data.dormitory_data.dormitory_name'), PG_ENCRYPT_KEY), "dormitory_name"],
            [Sq.fn('concat', Sq.col('comment_by_user.first_name'), ' ', Sq.col("comment_by_user.last_name")), "user_fullname"],
        ],
        include: [
            {
                model: BssStudentsModel, as: "comment_student_data",
                where: inner_where_data,
                attributes: [],
                // dormitory_data
                include: {
                    model: BssDormitoriesModel, as: "dormitory_data",
                    attributes: [],
                }
            },
            {
                model: BssUsersModel, as: "comment_by_user",
                attributes: []

            }
        ],
        ...query_data, order: [["diary_comment_id", "desc"]],
        hooks: false
    }).then(async (response) => {
        //Today time
        const todayDate = DateTime.now().setZone(timezone).toFormat(('dd/MM/yyyy'))

        let file_name = `Export-MedicalIssuedPdf-${new Date().getTime()}.pdf`;
        let uploadFilePath = `uploads/${school_code}/${file_name}`;
        const createPdfFile = fs.createWriteStream(uploadFilePath);

        // init document
        let doc = new PDFDocument({ margin: 25, size: 'A4' });
        // save document

        doc.pipe(createPdfFile);

        let parseData = JSON.stringify(response)
        parseData = JSON.parse(parseData)

        // table
        const headerTable = {
            title: { label: "Student Medical Issued", fontSize: 20 },
            subtitle: `Generated by Boarding School Suit`,
            headers: [
                {
                label: `Dormitory:${dormitory_id && parseData[0]?.dormitory_name ? parseData[0]?.dormitory_name : "All"}`, headerColor: "red", width: 274, headerColor: "white", renderer: null,
                },
                { label: `Date:${todayDate}`, width: 274, valign: "right", headerAlign: "right", align: "right", headerColor: "white", renderer: null, },

            ],
            options: {
                // yours options code here
                // divider lines
                divider: {
                    header: { disabled: false, width: 0.5, opacity: 0.5 },
                    horizontal: { disabled: false, width: 0.5, opacity: 0.5 },
                },
            }
        };
        await doc.table(headerTable,
            {
                prepareHeader: () => doc.font("Helvetica-Bold").fontSize(14),
                prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                    doc.font("Helvetica").fontSize(12);
                }
            });
        const table = {
            headers: [
                { label: "Roll No", property: 'unique_pin', width: 65, renderer: null, },
                { label: "Name", property: 'stu_fullname', width: 120, renderer: null, },
                { label: "Manager", property: 'user_fullname', width: 120, renderer: null, },
                { label: "Comments", property: 'diary_comment_desc', width: 170, renderer: null },
                { label: "Date", property: 'created_date_formated', width: 74, renderer: null },
            ],
            // DateTime.fromISO(res_value.created_date.toISOString()).setZone(timezone).toFormat('dd/MM/yyyy h:mm a')
            datas: [...parseData],
            rows: [],
        };
        await doc.table(table,
            {
                prepareHeader: () => doc.font("Helvetica-Bold").fontSize(12),
                prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                    doc.font("Helvetica").fontSize(12);

                }
            });
        doc.end();

        res.json({
            status: 200,
            success: true,
            // data: parseData,
            message: "Export Medical Issued Students Pdf successfully!",
            file: process.env.APP_URL + "/" + uploadFilePath
        })

        // Delete the file after 10 seconds
        setTimeout(async () => {
            let filePath = `${appRoot}/${uploadFilePath}`;
            await DeleteFile(filePath)
        }, "10000")

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
module.exports.GetAllClassStudentsCountForChart = async (req, res) => {
    const config_sequelize = req.config_sequelize;

    const BssStudentsModel = await BssStudents(config_sequelize);
    const BssClassesModel = await BssClasses(config_sequelize);
    BssClassesModel.findAll(
        {
            attributes: [
                "class_id", "class_name",
                [Sq.fn("count", Sq.col("class_students.student_id")), "student_count"]

            ],
            include: {
                model: BssStudentsModel, as: "class_students",
                attributes: [],
                where: { is_student_activate: true },
            },
            group: ["bss_classes.class_id", "bss_classes.class_name"
            ],
        }
    ).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Class WIse Students for Chart successfully!"
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
module.exports.GetUserAttendanceCountForChart = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    let { user_id, start_date, end_date } = req.query;

    let where_data = { user_id };

    if (start_date && end_date) {
        start_date = DateTime.fromFormat(start_date, "yyyy-MM-dd").startOf('day').toUTC().toISO();
        end_date = DateTime.fromFormat(end_date, "yyyy-MM-dd").endOf('day').toUTC().toISO();
        where_data = {
            ...where_data,
            created_date: {
                [Sq.Op.and]: {
                    [Sq.Op.gte]: start_date,
                    [Sq.Op.lte]: end_date
                }
            }
        }
    }

    const BssAttendanceUsersModel = await BssAttendanceUsers(config_sequelize);

    BssAttendanceUsersModel.findAll({
        where:where_data,

        attributes: [
            [Sq.literal(`DATE("bss_attendance_users"."created_date")`), 'atten_date'],
            [Sq.literal(`COUNT(*)`), 'count']
        ],
        group: ["atten_date",]

    }).then(async (response) => {

            const attendanceResponse = await BssAttendanceUsersModel.findAll({
            where: where_data,
            attributes: ["duration_time", "created_date"],
            order: [["created_date", "asc"]],
        })

        res.json({
            status: 200,
            success: true,
            countAttennd: response,
            data: attendanceResponse,
            message: "Get Manager Attedance for Chart successfully!"
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
module.exports.GetWeeklyAttendanceCountForChart = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user
    const timezone = login_user.user_school.timezone;

    const lastSevenDayDate = DateTime.now().setZone(timezone).minus({ weeks: 1 }).startOf('day').toISO();
    const yesterdayDate = DateTime.now().setZone(timezone).minus({ day: 1 }).endOf('day').toISO();
    const BssStudentAttendanceModel = await BssStudentAttendance(config_sequelize);

    BssStudentAttendanceModel.findAll({
        where: {
            created_date: {
                [Sq.Op.and]: {
                    [Sq.Op.gte]: lastSevenDayDate,
                    [Sq.Op.lte]: yesterdayDate
                }
            }
        },

        attributes: ["is_attendance", [Sq.fn('COUNT', Sq.col('is_attendance'),), 'atten_count',]],
        group: ["bss_student_attendance.is_attendance"]

    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Weekly Attedance for Chart successfully!"
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
module.exports.GetWeeklyAbsentReasonForChart = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user
    const timezone = login_user.user_school.timezone;

    const lastSevenDayDate = DateTime.now().setZone(timezone).minus({ weeks: 1 }).startOf('day').toISO();
    const yesterdayDate = DateTime.now().setZone(timezone).minus({ day: 1 }).endOf('day').toISO();

    const BssStudentAttendanceModel = await BssStudentAttendance(config_sequelize);
    const BssReasonsModel = await BssReasons(config_sequelize);
    BssStudentAttendanceModel.findAll({
        where: {
            created_date: {
                [Sq.Op.and]: {
                    [Sq.Op.gte]: lastSevenDayDate,
                    [Sq.Op.lte]: yesterdayDate
                }
            }, is_attendance: false,
        },
        
        attributes: [
            [Sq.fn('COUNT', Sq.col('bss_student_attendance.reason_id'),), 'reason_count',]],
        include: [{
            model: BssReasonsModel, as: "atten_reason_data",
            attributes: ["reason_name"]
        },],
        group: ["bss_student_attendance.reason_id",
            "atten_reason_data.reason_uuid",
            "atten_reason_data.reason_id"]
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Weekly Attedance for Chart successfully!"
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

module.exports.GetAllDashboardDiscadedAttendance = async (req, res) => {

    try {
        const login_user = req.login_user;
        const config_sequelize = req.config_sequelize;
        const { timezone, } = login_user.user_school;
        const { user_id, specific_year } = req.query;

        let where_obj = {};

        if (specific_year) {
            //specific year only
            const fromDate = DateTime.fromObject({ year: specific_year, }).setZone(timezone).startOf('day').toISO();
            const toDate = DateTime.fromObject({ year: specific_year, }).setZone(timezone).plus({ year: 1 },).endOf('day').toISO();
            where_obj = {
                created_date: {
                    [Sq.Op.between]: [fromDate, toDate]
                }
            };
        };
        if (user_id) {
            where_obj = {
                ...where_obj,
                created_by: user_id
            };

        };
        const BssUsersModel = await BssUsers(config_sequelize);
        const BssAttendanceDiscardedModel = await BssAttendanceDiscarded(config_sequelize);
        const bssAttendanceDiscardedRes = await BssAttendanceDiscardedModel.findAndCountAll({
            where: where_obj,
            attributes: ["attendance_discarded_id", "alloted_time_limit", "session_start_at", "attendance_title","created_date"],
            include: { model: BssUsersModel, attributes: ["user_id", "first_name", "last_name"] },
            order: [["created_date", "desc"]]
        });

        res.json({
            status: 200,
            success: true,
            data: bssAttendanceDiscardedRes,
            message: "Get all dashboard  discarded roll call successfully!"
        });

    } catch (error) {
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })
    };

};
