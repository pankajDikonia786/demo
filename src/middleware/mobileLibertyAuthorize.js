const jwt = require("jsonwebtoken");
const Sq = require("sequelize");
const { BssStudents, BssParents, } = require("../Services/Models/common");

function mobileLibertyAuthorize() {
    return [
        async (req, res, next) => {
            const config_sequelize = req.config_sequelize;
            const BssStudentsModel = await BssStudents(config_sequelize);
            const BssParentsModel = await BssParents(config_sequelize);
            const tokenString = req.headers.authorization;

            if (!tokenString) {
                return res.json({
                    status: 401,
                    success: false,
                    message: "Unauthorized",
                });
            };

            let token = req.headers.authorization.split(" ")[1];
            let userStudentRes;
            let userParentRes;

            try {
                let decoded = jwt.verify(token, "Bss_Super_Secret");
                console.log(decoded)
                if (decoded.login_user_type == "father" || decoded.login_user_type == "mother") {
                    userParentRes = await BssParentsModel.findOne({ where: { parent_id: decoded.parent_id } });
                    if (userParentRes) userParentRes.login_user_type = decoded.login_user_type;
                    if (!userParentRes) {
                        return res.json({
                            status: 401,
                            success: false,
                            message: "Unauthorized!!",
                        });
                    };

                };
                if (decoded.login_user_type == "student") {
                    userStudentRes = await BssStudentsModel.findOne({
                        where: { student_id: decoded.student_id },
                        raw: true
                    });
                    console.log(decoded.student_id)
                    if (userStudentRes) userStudentRes.login_user_type = decoded.login_user_type;
                    if (!userStudentRes) {
                        return res.json({
                            status: 401,
                            success: false,
                            message: "Unauthorized!",
                        });
                    };
                };


                // if (user.user_school?.is_school_activate == false || user.user_school?.is_school_activate == "false"
                //     || user.is_user_activate === false || user.is_user_activate === "false") {
                //     return res.json({
                //         status: 401,
                //         success: false,
                //         message: "Your account has been deactivated,please reach out to support for activate the account",
                //     });
                // }

                req.login_user = userStudentRes || userParentRes;
                next();
            } catch (error) {
                console.log(error)
                return res.json({
                    status: 401,
                    success: false,
                    message: "Unauthorized",
                });
            }
        },
    ];
}
module.exports = mobileLibertyAuthorize;