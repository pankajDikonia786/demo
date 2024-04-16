const Sq = require("sequelize");
const bcrypt = require("bcrypt");
const {BssStudents, BssParents, BssDormitories, BssHost, BssStudentHost, BssStudentNotes } = require("../../Models/common");


module.exports.GetStudentProfile = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;
        const { student_id } = req.query;

        const BssDormitoriesModel = await BssDormitories(config_sequelize);
        const BssStudentsModel = await BssStudents(config_sequelize);
        const BssHostModel = await BssHost(config_sequelize);
        const BssStudentHostModel = await BssStudentHost(config_sequelize);

        const studentRes = await BssStudentsModel.findOne({
            where: { student_id },
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

                    [Sq.fn('PGP_SYM_DECRYPT', Sq.col('mother_email'), PG_ENCRYPT_KEY), "mother_email"],
                    [Sq.fn('PGP_SYM_DECRYPT', Sq.col('mother_phone'), PG_ENCRYPT_KEY), "mother_phone"],
                ],
                include: [
                    {
                        model: BssStudentHostModel, as: "parents_as_host", attributes: ["student_host_uuid", "student_host_id",
                            "parent_type", "host_relation", "host_status", "is_host_approved", "student_host_comment"]
                    }]
            },
            {
                model: BssHostModel, as: "stu_host_data",
                attributes: ["host_id", "host_uuid", "host_name", "remark_parents", "remark_boarding", "remark_host",
                    [Sq.fn('PGP_SYM_DECRYPT', Sq.col('host_email'), PG_ENCRYPT_KEY), "host_email"],
                    [Sq.fn('PGP_SYM_DECRYPT', Sq.col('host_contact'), PG_ENCRYPT_KEY), "host_contact"],
                    [Sq.fn('PGP_SYM_DECRYPT', Sq.col('host_address'), PG_ENCRYPT_KEY), "host_address"],
                ],
                through: { attributes: [], },
                include: {
                    model: BssStudentHostModel, as: "stu_host",
                    where: { is_host_approved: true },
                    attributes: ["student_host_uuid", "is_host_approved", "student_host_comment", "host_relation", "host_status",]
                }
            },
            {
                model: BssDormitoriesModel, as: "dormitory_data",
                attributes: [[Sq.fn('PGP_SYM_DECRYPT', Sq.col('dormitory_name'), PG_ENCRYPT_KEY), "dormitory_name"],
                    "dormitory_uuid"]
            },],
        });

        res.json({
            status: 200,
            success: true,
            data: studentRes,
            message: "Get Student details successfully!"
        })

    } catch (error) {
        console.log(error);
        console.log(error)
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."

        });
    }
};

//working
//change password for parents or student
module.exports.ChangeStudentOrParentPassword = async (req, res) => {
    try {
        const config_sequelize = req.config_sequelize;
        const liberty_login_user = req.liberty_login_user;
        const { login_user_type } = liberty_login_user;
        const { oldPassword, newPassword, confirmPassword } = req.body;

        if (newPassword !== confirmPassword) {
            return (
                res.json({
                    status: 400,
                    message: `password not matched!`
                })
            )
        };
        const BssStudentsModel = await BssStudents(config_sequelize);
        const BssParentsModel = await BssParents(config_sequelize);
        let bcryptPassword = await bcrypt.hash(newPassword, 10);
        let PasswordCompare;

        if (login_user_type === "student") {
            const studentRes = await BssStudentsModel.scope("withPassword").findOne({
                where: { student_id: liberty_login_user.student_id }, returning: true, raw: true,
                include: {
                    model: BssParentsModel, as: 'parent_data',
                    attributes: ["parent_id", "mother_password", "father_password"]
                }
            });
            PasswordCompare = await bcrypt.compare(oldPassword, studentRes.student_password);
            if (PasswordCompare) {
                await BssStudentsModel.update({ student_password: bcryptPassword }, {
                    where: { student_id: liberty_login_user.student_id },
                });
            };
        };
        if (login_user_type === "mother" || login_user_type == "father") {
            let parentPasswordObj = {};
            const ParentsRes = await BssParentsModel.scope("withPassword").findOne({
                where: { parent_id: liberty_login_user.parent_id }, attributes: ["father_password", "mother_password"],
                hooks: false
            });
            console.log(ParentsRes)
            login_user_type === "father" ? parentPasswordObj.father_password = ParentsRes.father_password : parentPasswordObj.mother_password = ParentsRes.mother_password;

            PasswordCompare = await bcrypt.compare(oldPassword, parentPasswordObj.father_password || parentPasswordObj.mother_password);

            if (PasswordCompare) {

                await BssParentsModel.update({ parentPasswordObj }, {
                    where: { parent_id: liberty_login_user.parent_id }
                });
            };
        };
        res.json({
            status: 200,
            success: true,
            message: `Password update Successfully!`,
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

