'use strict';

const ADODB = require('node-adodb');

const connection = ADODB.open('Provider=Microsoft.Jet.OLEDB.4.0;Data Source=C:\\Program Files (x86)\\Att\\att2000.mdb;');

async function queryDatabase(query) {
    return await connection.query(query);
}

async function updateStatus(userId, currentDate) {
    try {
        const updateStatusQuery = `UPDATE CHECKINOUT SET statusMsg = 1 WHERE USERID = ${userId} AND FORMAT(CHECKTIME, 'YYYY-MM-DD') >= '${currentDate}'`;
        await queryDatabase(updateStatusQuery);
    } catch (error) {
        console.error('Error:', error);
    }
}

module.exports = { connection, queryDatabase, updateStatus };