require("dotenv").config({
    path: __dirname + "/.env",
});

const express = require("express");
const cors = require("cors");
const path = require("path");
const pg = require("pg")

//Set global variable
global.appRoot = __dirname;
global.__dirname = __dirname;
global.server_url = process.env.APP_URL;
global.PG_ENCRYPT_KEY = process.env.PG_ENCRYPT_KEY;

//initialize the app with express module
let app = express();
const http = require('http').Server(app);

//socket io
const io = require('socket.io')(http, {
    cors: { origin: '*', }
});

app.use(cors());


//Parser for post data
app.use(express.json());//for parsing application/json(post or put)
app.use(express.urlencoded({ extended: true }));//for parsing application/x-www-form-urlencoded((post or put) or array)

// var router = express.Router()

//Includes Service Api Files
app.use(require('./src/Services'));
// app.use("/uploads/", express.static(path.join(__dirname, "/uploads")));
app.use("backend-assets", express.static(path.join(__dirname, "backend-assets")));
app.use(express.static('backend-assets'));
console.log(__dirname)
// sendFile will go here
app.use("/", express.static(path.join(__dirname, "/frontend/build")));
app.use("/*", express.static(path.join(__dirname, "/frontend/build")));


/*****Get the port from environment and store in Express****/
const port = process.env.PORT || "8009";

const server = http.listen(port, function () {
    console.log(`App started on port ${port}`);
});

//Socket IO notifications

io.on("connection", async (socket) => {
    console.log("Made socket connection",);
    // server side code
    // socket.on('room', function (school_code) {
    //     console.log(school_code)
    //     socket.join(school_code);
    // });
    socket.on("disconnect", function () {
        console.log("Made socket disconnected");
    });

});

global.socketIO = io;



