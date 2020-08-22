const dbConfig = require('../config/database');
const sql = require("mssql");

const connection = new sql.connect(dbConfig);

module.exports = connection;