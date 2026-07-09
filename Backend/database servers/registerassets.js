const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.db_host,
    user:process.env.db_user,
    password: process.env.db_password,
    database: process.env.db_database4,
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0
});

module.exports = pool.promise();
