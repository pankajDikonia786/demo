const Sequelize = require("sequelize");
const { BssSchoolDetails, BssUsers } = require("../Services/Models/common");

function configBssDb() {
    return [
        async (req, res, next) => {
            // console.log("-----------", req.headers)
        
            if (!req.headers.country_host && !req.headers.school_code) {

                return res.json({
                    status: 400,
                    success: false,
                    message: "Country host and School code required!"
                })
            }

            let sequelize2 = new Sequelize(
                //database name
                req.headers.school_code,
                process.env.DB_USERNAME,
                process.env.DB_PASSWORD,
                {
                    host: req.headers.country_host,
                    dialect: "postgres",
        //                 pool: {
        //     max: 100,    //maximum connection which postgresql or mysql can intiate
        //     min: 0,     //maximum connection which postgresql or mysql can intiate
        //     acquire: 20000, // time require to reconnect 
        //     idle: 10000, // get idle connection
        //     evict: 10000,// it actualy removes the idle connection

        // }
                });

  sequelize2.addHook('afterInit', function (sequelize) {
  sequelize.options.handleDisconnects = false;

  // Disable pool completely
  sequelize.connectionManager.pool.destroyAllNow();
  sequelize.connectionManager.pool = null;
  sequelize.connectionManager.getConnection = function getConnection() {
    return this._connect(sequelize.config);
  };
  sequelize.connectionManager.releaseConnection = function releaseConnection(connection) {
    return this._disconnect(connection);
  };
})

            req.config_sequelize = sequelize2;
            try {
                sequelize2
                    .authenticate()
                    .then(() => {

                        console.log("Connection has been established successfully.");
                    })
                    .catch((err) => {
                        console.log("Unable to connect to the database:", err);
                    });
            } catch (err) {
                console.log("an error occured", err);
            }

            next();

        },
    ];
}

module.exports = configBssDb;

