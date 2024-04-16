const Sq = require("sequelize");
const { BssDormitories, BssClasses, BssUsers, BssDormitoryUsers } = require("../Models/common");
const { DeleteFile } = require("../../libs/Helper");

module.exports.CreateDormitories = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const bss_dormitory_details = req.body;
    const file_data = req.file;
    console.log("dormitory_deails-------", bss_dormitory_details)
    bss_dormitory_details.created_by = login_user.user_id;
    file_data?.path ? bss_dormitory_details.dormitory_image = file_data?.path : bss_dormitory_details.dormitory_image = ""
    // console.log(bss_dormitory_details)

    const BssDormitoryUsersModel = await BssDormitoryUsers(await config_sequelize);
    const BssDormitoriesModel = await BssDormitories(await config_sequelize);

    await BssDormitoriesModel.create(bss_dormitory_details).then(async (response) => {
        console.log("response", response)

        // create dormitory users relation if new added 
        const dormitory_users_ids = JSON.parse(bss_dormitory_details.user_ids);

        for (const user_id of dormitory_users_ids) {
            await BssDormitoryUsersModel.create({ user_id: user_id, dormitory_id: response.dormitory_id })

        }

        res.json({
            status: 200,
            success: true,
            message: "Create Dormitory successfully!"
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

module.exports.GetAllDormitory = async (req, res) => {
    const { page, limit, order, sort, search, dormitory_status } = req.query;
    const config_sequelize = req.config_sequelize;
    console.log(req.query)

    let where_object = {};
    let query_object = {};

    if (dormitory_status === "true" || dormitory_status === true) {
        where_object.dormitory_status = true;
    }

    if (dormitory_status === "false" || dormitory_status === false) {
        where_object.dormitory_status = false;
    }

    if (search) {
        where_object = {
            ...where_object,
            dormitory_name: Sq.where(Sq.fn("LOWER", Sq.fn('PGP_SYM_DECRYPT', Sq.col("dormitory_name"), PG_ENCRYPT_KEY)), "LIKE", search.toLowerCase())

            // Sq.where(Sq.fn('LOWER', Sq.col('dormitory_name')), { [Sq.Op.iLike]: `%${search.toLowerCase()}%` })
        }
    }

    if (page && limit) {

        query_object.offset = 0 + (page - 1) * limit;
        query_object.limit = limit;
    }

    if (order && sort) {
        query_object = {
            ...query_object,
            order: [[sort, order]]
        }
    }

    const BssDormitoriesModel = await BssDormitories(await config_sequelize);
    await BssDormitoriesModel.findAndCountAll({

        where: where_object,

        ...query_object,
    }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get all Dormitories successfully!"
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

module.exports.UpdateDormitoryStatus = async (req, res) => {
    const { dormitory_uuid, dormitory_status } = req.body;
    const config_sequelize = req.config_sequelize;

    const BssDormitoriesModel = await BssDormitories(await config_sequelize);

    BssDormitoriesModel.update({ dormitory_status }, { where: { dormitory_uuid }, }).then((response) => {
        console.log(dormitory_status)

        res.json({
            status: 200,
            success: true,
            message: `Dormitory ${dormitory_status == true || dormitory_status == "true" ? 'Activated' : "Deactivated"} successfully`
        })

    }).catch((error) => {
        console.log(error);
        res.json({
            status: 400,
            error: error,
            success: false,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })
    })
}

module.exports.UpdateDormitory = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const dormitory_details = req.body;
    const { dormitory_uuid, dormitory_id } = dormitory_details;
    delete dormitory_details.dormitory_uuid;
    dormitory_details.updated_by = login_user.user_id
    const file_data = req?.file;

    const BssDormitoryUsersModel = await BssDormitoryUsers(await config_sequelize);
    const BssDormitoriesModel = await BssDormitories(await config_sequelize);

    if (typeof file_data !== "undefined" && file_data?.path) {
        dormitory_details.dormitory_image = file_data.path;

        let dormitoryResponse = await BssDormitoriesModel.findOne({ where: { dormitory_uuid } });

        if (dormitoryResponse?.dormitory_image) {

            let filePath = `${appRoot}/${dormitoryResponse?.dormitory_image}`;
            await DeleteFile(filePath)
        }
    }
    try {
        dormitory_details.dormitory_name = Sq.fn("PGP_SYM_ENCRYPT ", dormitory_details.dormitory_name, PG_ENCRYPT_KEY);
        dormitory_details.bio_note = Sq.fn("PGP_SYM_ENCRYPT ", dormitory_details.bio_note, PG_ENCRYPT_KEY);
        config_sequelize.transaction(async (transactionInstance) => {
            await BssDormitoriesModel.update(dormitory_details, { where: { dormitory_uuid }, transaction: transactionInstance })
         console.log("-------------",dormitory_details)

            const dormitory_users_ids = JSON.parse(dormitory_details.user_ids);


            if (dormitory_users_ids.length > 0) {

                // destroy existing dormitory user relation 
                await BssDormitoryUsersModel.destroy({
                    where:
                        { user_id: { [Sq.Op.notIn]: dormitory_users_ids }, dormitory_id: dormitory_id },

                    transaction: transactionInstance
                });
                for (const user_id of dormitory_users_ids) {
                    await BssDormitoryUsersModel.findOrCreate({
                        where: { user_id: user_id, dormitory_id: dormitory_id },
                        user_id: user_id, dormitory_id: dormitory_id
                    });
                }
            }
            res.json({
                status: 200,
                success: true,
                message: `Dormitory details updated successfully!`
            })
        });
    } catch (error) {
        console.log(error)
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."

        })
    }
}

module.exports.GetDormitoryDetailsById = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const { dormitory_uuid } = req.query;

    const BssDormitoriesModel = await BssDormitories(await config_sequelize);
    const BssUsersModel = await BssUsers(await config_sequelize);
    BssDormitoriesModel.findOne({
        where: { dormitory_uuid },
        include: [{
            model: BssUsersModel,
            as: "dormitory_users",
            attributes: ["user_id", "user_uuid", "school_detail_id", "first_name", "last_name"],
        }]

    }).then((response) => {

        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Dormitory details successfully!"
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
module.exports.RemoveDormitoryUser = async (req, res) => {

    const config_sequelize = req.config_sequelize;
    const { dormitory_user_uuid } = req.body;

    const BssDormitoryUsersModel = await BssDormitoryUsers(await config_sequelize);

    BssDormitoryUsersModel.destroy({ where: { dormitory_user_uuid }, }).then((response) => {
        res.json({
            status: 200,
            success: true,
            message: "Dormitory Manager Removed successfully!"
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


module.exports.DeleteDormitory = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const { dormitory_uuid } = req.body;

    const BssDormitoriesModel = await BssDormitories(await config_sequelize);
    BssDormitoriesModel.destroy({ where: { dormitory_uuid }, individualHooks: true, login_user: login_user, }).then((response) => {
        res.json({
            status: 200,
            success: true,
            message: "Dormitory deleted successfully!"
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
module.exports.CreateClass = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const class_details = req.body;
    class_details.created_by = login_user.user_id;

    class_details.class_no = parseInt(class_details.class_name.replace(/th|st|nd|rd|year|Year/g, " "));

    const BssClassesModel = await BssClasses(await config_sequelize);

    if (await BssClassesModel.findOne({ where: { class_name: class_details.class_name } })) {
        return res.json({
            status: 400,
            success: false,
            message: "Class already exist's!"
        })
    }

    BssClassesModel.create(class_details).then((response) => {
        res.json({
            status: 200,
            success: true,
            message: "Class created successfully!"
        })

    }).catch((error) => {
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })

    })

}

module.exports.GetAllClassesDetails = async (req, res) => {

    const config_sequelize = req.config_sequelize;
    const { page, limit, sort, order, is_class_activate } = req.query;
    const where_object = {};
    const query_object = {};

    if (is_class_activate === true || is_class_activate === "true") {

        where_object.is_class_activate = true;
    }
    if (is_class_activate === false || is_class_activate === "false") {

        where_object.is_class_activate = false;
    }

    if (page && limit) {
        query_object.offset = 0 + (page - 1) * limit;
        query_object.limit = limit;

    }
    if (sort && order) {
        query_object.order = [[sort, order]];

    }

    const BssClassesModel = await BssClasses(await config_sequelize);
    BssClassesModel.findAndCountAll({ where: where_object, ...query_object }).then(async (response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get all classes details successfully!"
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
module.exports.GetAllClassesList = async (req, res) => {

    const config_sequelize = req.config_sequelize;
    const BssClassesModel = await BssClasses(await config_sequelize);

    BssClassesModel.findAndCountAll({ where: { is_class_activate: true }, order: [["class_no", "asc"]] })
        .then(async (response) => {
            res.json({
                status: 200,
                success: true,
                data: response,
                message: "Get all Classes List successfully!"
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
module.exports.GetClassDetailsById = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const { class_uuid } = req.query;

    const BssClassesModel = await BssClasses(await config_sequelize);
    BssClassesModel.findOne({ where: { class_uuid } }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Class details successfully!"
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

module.exports.UpdateClass = async (req, res) => {

    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const class_details = req.body;
    const class_uuid = class_details.class_uuid;
    delete class_details.class_uuid;
    class_details.updated_by = login_user.user_id;

    const BssClassesModel = await BssClasses(await config_sequelize);
    BssClassesModel.update(class_details, { where: { class_uuid } }).then((response) => {
        res.json({
            status: 200,
            success: true,
            message: "Class updated successfully!"
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
module.exports.UpdateClassStatus = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const { class_uuid, is_class_activate } = req.body;

    const BssClassesModel = await BssClasses(await config_sequelize);
    BssClassesModel.update({ is_class_activate, updated_by: login_user.user_id }, { where: { class_uuid } })
        .then((reponse) => {
            res.json({
                status: 200,
                success: true,
                message: `Class ${is_class_activate === true || is_class_activate === "true" ? "Activated" : "Deactivated"} Successfully!`
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
//class delele not applied
module.exports.DeleteClass = async (req, res) => {
    const config_sequelize = req.config_sequelize;
    const login_user = req.login_user;
    const { class_uuid } = req.body;

    const BssClassesModel = await BssClasses(await config_sequelize);
    BssClassesModel.destroy({ where: { class_uuid }, individualHooks: true, login_user: login_user })
        .then((reponse) => {
            res.json({
                status: 200,
                success: true,
                message: `Class Deleted Successfully!`
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

