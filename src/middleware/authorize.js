const jwt = require("jsonwebtoken");
const { Users, SchoolDetails } = require("../Services/Models/admin");

function authorize() {
    return [
        async (req, res, next) => {

            const tokenString = req.headers.authorization;

            if (!tokenString) {
                return res.json({
                    status: 401,
                    success: false,
                    message: "Unauthorized",
                });
            }

            let token = req.headers.authorization.split(" ")[1];

            try {
                let decoded = jwt.verify(token, "Bss_Super_Secret");
                const user = await Users.findOne({
                    where: {
                        user_uuid: decoded.user_uuid,
                    },
                    include: {
                        model: SchoolDetails, as: "user_school",
                        attributes: ["school_detail_uuid", "is_school_activate",
                            "school_name", "country_host", "timezone", "school_code", "country"]
                    }
                });

                if (!user) {
                    return res.json({
                        status: 401,
                        success: false,
                        message: "Unauthorized",
                    });
                }
                if (user.user_school?.is_school_activate == false || user.user_school?.is_school_activate == "false"
                    || user.is_user_activate === false || user.is_user_activate === "false") {
                    return res.json({
                        status: 401,
                        success: false,
                        message: "Your account has been deactivated,please reach out to support for activate the account",
                    });
                }

                req.login_user = user;
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
module.exports = authorize;