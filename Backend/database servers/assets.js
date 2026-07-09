const mysql = require('mysql2');
require('dotenv').config();

const assetPool = mysql.createPool({
    host: process.env.db_host,
    user:process.env.db_user,
    password: process.env.db_password,
    database: process.env.db_database3,
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0
})

module.exports = assetPool.promise()