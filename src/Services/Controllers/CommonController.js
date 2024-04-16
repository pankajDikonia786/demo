const Sq = require("sequelize");

const { Cities, Countries, States, Timezones, CountryRegions } = require("../Models/public");

module.exports.GetAllCountries = async (req, res) => {

    Countries.findAll().then(async (response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get all countries successfully!"
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

module.exports.GetAllStatesByCountryId = async (req, res) => {

    const { country_id, page, limit, order, sort, search } = req.query;
    let query_data = {};
    let where_data = { country_id };
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
        where_data = {
            ...where_data,
            state_name: Sq.where(Sq.fn('LOWER', Sq.col('state_name')), { [Sq.Op.iLike]: `%${search.toLowerCase()}%` })
        }
    }

    States.findAndCountAll({ where: where_data, ...query_data }).then(async (response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get State's details successfully!"
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

module.exports.GetAllCitiesByStateId = async (req, res) => {
    const { state_id, page, limit, order, sort, search } = req.query;
    let query_data = {};
    let where_data = { state_id };
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
        where_data = {
            ...where_data,
            city_name: Sq.where(Sq.fn('LOWER', Sq.col('city_name')), { [Sq.Op.iLike]: `%${search.toLowerCase()}%` })
        }
    }

    Cities.findAndCountAll({ where: where_data, ...query_data }).then(async (response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get Cities details successfully!"
        })

    }).catch((error) => {
        console.log(error)
        console.log(error);
        res.json({
            status: 400,
            success: false,
            error: error,
            message: "Something went wrong. Please try again or reach out to support if the issue persists."

        })

    })
}

module.exports.GetAllTimezonesByCountryCode = async (req, res) => {
    const { country_code } = req.query;

    Timezones.findAll({ where: { country_code } }).then(async (response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get timezones details successfully!"
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

module.exports.GetAllCountryRegions = async (req, res) => {

    CountryRegions.findAll().then((response) => {
        res.json({
            status: 200,
            success: true,
            data: response,
            message: "Get all Country region's successfully!"
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