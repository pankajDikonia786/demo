const Sequelize = require("sequelize")

const sequelize = new Sequelize(
    process.env.DB_DATABASE,
    process.env.DB_USERNAME,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: "postgres",
        //     pool: {
        //     max: 100,    //maximum connection which postgresql or mysql can intiate
        //     min: 0,     //maximum connection which postgresql or mysql can intiate
        //     acquire: 20000, // time require to reconnect 
        //     idle: 10000, // get idle connection
        //     evict: 10000,// it actualy removes the idle connection

        // }
    });
Sequelize.addHook('afterInit', function (sequelize) {
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

try {
    sequelize
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


module.exports = sequelize


