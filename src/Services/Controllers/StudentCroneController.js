const Sq = require("sequelize");
const cron = require('node-cron');
const { DateTime } = require("luxon");
const { getAge } = require("../../libs/Helper");
const { configNewDb } = require("../../libs/NewDb");
const { SchoolDetails } = require("../Models/admin");
const { BssStudents,BssSystemLogs ,BssSchoolDetails } = require("../Models/common");
const SystemLogsFun = require("../../libs/Helper");

//Crone Job for Update the student Age according to the Birthday
// module.exports.UpdateAllSchoolStudentsAgeCrone = async (req, res) => {
cron.schedule("0 0 8 * * *", async () => {

    try {
        const allSchoolResponse = await SchoolDetails.findAll()

        if (allSchoolResponse.length > 0) {

        
            allSchoolResponse.forEach(async (school_value) => {
     
                const todayDate = DateTime.now().toFormat('MM-dd');

                const BssStudentsModel = await BssStudents(await configNewDb({
                    school_code: school_value.school_code, country_host: school_value.country_host,sync_db: false
                }))
              
                const BssSystemLogsModel = await BssSystemLogs(await configNewDb({
                    school_code: school_value.school_code, country_host: school_value.country_host,sync_db: false
                }))

                BssStudentsModel.findAll({
                    where: {
                        date_of_birth: Sq.where(Sq.fn('PGP_SYM_DECRYPT', Sq.col('date_of_birth'),
                            PG_ENCRYPT_KEY), "LIKE", "%" + todayDate)
                    },
                    attributes: ["student_uuid", "student_id", "student_age","student_first_name","student_last_name",

                        [Sq.fn('PGP_SYM_DECRYPT', Sq.col('date_of_birth'),
                            PG_ENCRYPT_KEY), "date_of_birth"]],
                    hooks: false,
                    raw: true
                }).then(async (studentResponse) => {
                    if (studentResponse.length > 0) {
                        studentResponse.forEach(async (student_value) => {
                            const student_calculated_age = await getAge(await student_value.date_of_birth)

                            //logs save in database
                           let sys_obj ={
                            user_id:'1',
                            action:'Birthday logs',
                            html_info:`Happy birthday to <strong> ${student_value.student_first_name} ${student_value.student_last_name} </strong> !`
                           }
                           await BssSystemLogsModel.create(sys_obj)
            
                            await BssStudentsModel.update(
                                { student_age: student_calculated_age },
                                {
                                    where: { student_uuid: student_value.student_uuid }
                                }
                            );
                        })

                    }
                    console.log("Update all School Students Age Crone successfully!",)

                }).catch((error) => {
                    console.log("Update all School Students Age Crone error ", error)
                })

            })

        } else {
            console.log("No Related data found for Update all School Students Age crone!")
        }
    } catch (error) {
        console.log("Update all School Students Age Crone error ", error.message)

    }
},
 { timeZone: 'Asia/Kolkata' });



 cron.schedule("0 0 0 * * *", async () => {

    try {
        const allSchoolResponse = await SchoolDetails.findAll()

        if (allSchoolResponse.length > 0) {

        
            allSchoolResponse.forEach(async (school_value) => {
     
                const todayDate = DateTime.now().toFormat('MM-dd');

                const BssStudentsModel = await BssStudents(await configNewDb({
                    school_code: school_value.school_code, country_host: school_value.country_host,sync_db: false
                }))
              
                const BssSystemLogsModel = await BssSystemLogs(await configNewDb({
                    school_code: school_value.school_code, country_host: school_value.country_host,sync_db: false
                }))

                BssStudentsModel.findAll({
                    where: {
                        date_of_birth: Sq.where(Sq.fn('PGP_SYM_DECRYPT', Sq.col('date_of_birth'),
                            PG_ENCRYPT_KEY), "LIKE", "%" + todayDate)
                    },
                    attributes: ["student_uuid", "student_id", "student_age","student_first_name","student_last_name",

                        [Sq.fn('PGP_SYM_DECRYPT', Sq.col('date_of_birth'),
                            PG_ENCRYPT_KEY), "date_of_birth"]],
                    hooks: false,
                    raw: true
                }).then(async (studentResponse) => {
                    if (studentResponse.length > 0) {
                        studentResponse.forEach(async (student_value) => {
                            const student_calculated_age = await getAge(await student_value.date_of_birth)

                            //logs save in database
                           let sys_obj ={
                            user_id:'1',
                            action:'Birthday logs',
                            html_info:`Happy birthday to <strong> ${student_value.student_first_name} ${student_value.student_last_name} </strong> !`
                           }
                           await BssSystemLogsModel.create(sys_obj)
                           console.log(sys_obj)
            
                            await BssStudentsModel.update(
                                { student_age: student_calculated_age },
                                {
                                    where: { student_uuid: student_value.student_uuid }
                                }
                            );
                        })

                    }
                    console.log("Update all School Students Age Crone successfully!",)

                }).catch((error) => {
                    console.log("Update all School Students Age Crone error ", error)
                })

            })

        } else {
            console.log("No Related data found for Update all School Students Age crone!")
        }
    } catch (error) {
        console.log("Update all School Students Age Crone error ", error.message)

    }
},
 { timeZone: 'Asia/Kolkata' });



//  cron.schedule('* * * * *',async()=>{
//     console.log("this this schedule")

//  })

