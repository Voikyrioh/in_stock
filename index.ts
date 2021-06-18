import databaseInstance from "./Services/MysqlService";
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const environment = process.env;

if (!environment.RETARDED_DATABASE_PASSWORD || !environment.RETARDED_DATABASE_USERNAME || !environment.RETARDED_DATABASE_HOST) {
    throw new Error("[FATAL] Global vars 'RETARDED_DATABASE_PASSWORD', 'RETARDED_DATABASE_USERNAME', 'RETARDED_DATABASE_HOST' are needed");
}

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

databaseInstance.connectDatabase({
    host: environment.RETARDED_DATABASE_HOST,
    user: environment.RETARDED_DATABASE_USERNAME,
    password: environment.RETARDED_DATABASE_PASSWORD,
    database: "stock_for_retarded",
})
    .then(value => {
    console.log('MysqlServer - Connected !')
})
    .catch(error => {
    console.error("[FATAL] Could not create database connexion : ", error);
    return 1;
});

if (!environment.HOST || !environment.PORT) {
    throw new Error("Error : Host and/or port need to be specified");
}

const host = environment.HOST;
const port = environment.PORT;
const protocol = environment.PROTOCOL || 'http';

/*
*  Security Part
* */
if (protocol === 'https') {
    //TODO ssl and https managing
}

app.use(cors({origin: 'http://localhost:3000', credentials: true}));

/*
*  Get all sources informations route
* */
app.use(require("./routes/ProductRoutes"));
app.use(require("./routes/RetardedRoutes"));
app.use(require("./routes/SourceRoutes"));

app.listen(port, () => {
    console.log(`[Info] API Started on ${protocol}://${host}:${port}`);
});
