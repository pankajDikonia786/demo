const Sq = require("sequelize");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { configNewDb } = require("../../../libs/NewDb");
const { DeleteFile } = require("../../../libs/Helper");
const { SchoolDetails, Users } = require("../../Models/admin");
const { BssUsers, BssSchoolDetails } = require("../../Models/common/");
const { Countries, States, Cities } = require("../../Models/public");


module.exports.SelectCountry = async (req, res) => {
    const { country_id, is_selected, country_host } = req.body;

    Countries.update({ is_selected, country_host }, { where: { country_id } }).then((response) => {
        res.json({
            status: 200,
            success: true,
            message: "Country updated successfully!"
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
module.exports.GetAllSelectedCountries = async (req, res) => {
    const { search, page, limit, order, sort } = req.query;
    let where_data = [{ is_selected: true }];
    let query_data = {};

    if (page && limit) {

        query_data.offset = 0 + (page - 1) * limit;
        query_data.limit = limit
    }

    if (order && sort) {
        query_data = {
            ...query_data,
            order: [[sort, order]]
        }
    }
    if (search) {

        where_data.push({

            name: Sq.where(Sq.fn('LOWER', Sq.col('name')), { [Sq.Op.iLike]: `%${search.toLowerCase()}%` })
        });
    }
    Countries.findAndCountAll({ where: where_data, ...query_data }).then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get all selected countries successfully!"
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
};

module.exports.CreateNewState = async (req, res) => {
    const login_user = req.login_user;
    const state_detail = req.body;

    state_detail.created_by = login_user.user_uuid;
    console.log(state_detail)

    if (state_detail.state_name && state_detail.country_id) {
        let stateResponse = await States.findOne({ where: { state_name: Sq.where(Sq.fn("LOWER", Sq.col('state_name')), state_detail.state_name.toLowerCase()) } })

        console.log(stateResponse)
        if (stateResponse) {
            return res.json({
                status: 400,
                success: false,
                message: "this State name is already exists!"
            })

        }
        States.create(state_detail).then((response) => {
            res.json({
                status: 200,
                success: true,
                message: "State created successfully!"
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
    } else {
        res.json({
            status: 400,
            success: false,
            message: "Bad Request !"
        })
    }
};

module.exports.CreateNewCity = async (req, res) => {
    const login_user = req.login_user;
    const city_detail = req.body;
    city_detail.created_by = login_user.user_uuid;
    if (city_detail.state_id && city_detail.city_name) {

        let cityResponse = await Cities.findOne({ where: { city_name: Sq.where(Sq.fn("LOWER", Sq.col('city_name')), city_detail.city_name.toLowerCase()) } })
        if (cityResponse) {
            return res.json({
                status: 400,
                success: false,
                message: "This City name is already exist!"
            })
        }
        Cities.create(city_detail).then((response) => {
            res.json({
                status: 200,
                success: true,
                message: "City created successfully!"
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
    } else {
        res.json({
            status: 400,
            success: false,
            message: "Bad Request !"
        })
    }
}
module.exports.DeactivateState = async (req, res) => {
    const login_user = req.login_user;
    const state_detail = req.body;
    console.log(state_detail);
    States.update({ is_activate: state_detail.is_activate }, { where: { state_id: state_detail.state_id } }).then((response) => {
        let message;
        if (state_detail.is_activate == "false" || state_detail.is_activate == false) {
            message = "State deactivated successfully!"
        } else {
            message = "State activated successfully!"
        }

        res.json({
            status: 200,
            success: true,
            message: message
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
module.exports.DeactivateCity = async (req, res) => {
    const login_user = req.login_user;

    const city_detail = req.body;
    Cities.update({ is_activate: city_detail.is_activate }, { where: { city_id: city_detail.city_id } }).then((response) => {
        console.log(response)
        let message;
        if (city_detail.is_activate == "false" || city_detail.is_activate == false) {
            message = "City deactivated successfully!"
        } else {
            message = "City activated successfully!"
        }
        res.json({
            status: 200,
            success: true,
            message: message
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
module.exports.UpdateSchoolUser = async (req, res) => {
    const school_user_detail = req.body;
    const user_uuid = school_user_detail.user_uuid;
    delete school_user_detail.user_uuid;

    if (typeof req?.file !== "undefined" && req?.file?.path) {
        school_user_detail.avatar = req.file.path;

        let userResponse = await Users.findOne({ where: { user_uuid } });

        console.log(userResponse)
        if (userResponse?.avatar) {

            let filePath = `${appRoot}/${userResponse?.avatar}`;
            await DeleteFile(filePath)
        }
    }

    Users.update(school_user_detail, { where: { user_uuid }, returning: true, raw: true }).then(async (response) => {

        try {
            let { school_code, country_host } = school_user_detail;

            const BssUsersModel = await BssUsers(await configNewDb({ school_code, country_host,sync_db: false}));
            await BssUsersModel.update(school_user_detail, { where: { user_uuid: response[1][0].user_uuid }, returning: true, raw: true });

            return res.json({
                status: 200,
                success: true,
                message: "User details updated successfully!"
            })
        } catch (error) {
            console.log(error);
            return res.json({
                status: 400,
                success: false,
                error: error,
                message: "Something went wrong. Please try again or reach out to support if the issue persists."
            })
        }

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

module.exports.LoginAsSchoolAdmin = async (req, res) => {
    const { user_uuid } = req.body;

    Users.findOne({
        where: { user_uuid: user_uuid },
        include: { model: SchoolDetails, as: "user_school" }
    }).then((response) => {
        let token = jwt.sign({ user_uuid: response.user_uuid }, "Bss_Super_Secret");
        res.json({
            status: 200,
            success: true,
            data: response,
            token: token
        })

    }).catch((error) => {
        console.log(error)
        res.json({
            status: 400,
            success: false,
            erroe: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."
        })
    })
}
