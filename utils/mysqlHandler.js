const mysql = require('mysql');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'system_management_absensi',
};

const pool = mysql.createPool(dbConfig);

function queryDatabaseMysql(query) {
    return new Promise((resolve, reject) => {
        pool.query(query, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}

function insertAbsenToday(data) {
    const { uid, statusMsg, checkType, created_at, updated_at } = data;
    const query = `INSERT INTO absen (uid, statusMsg, checkType, created_at, updated_at) VALUES ('${uid}', '${statusMsg}', '${checkType}', '${created_at}', '${updated_at}')`;

    return queryDatabaseMysql(query);
}

function insertUserIntoDatabase(user) {
    const { uid, name, ophone } = user;
    const query = `INSERT INTO murid (uid, name, ophone) VALUES ('${uid}', '${name}', '${ophone}')`;

    return queryDatabaseMysql(query);
}

async function findUserInDatabase(uid) {
    const query = `SELECT uid FROM murid WHERE uid = '${uid}'`;
  
    const results = await queryDatabaseMysql(query);
  
    if (results.length > 0) {
        return results[0].uid;
    } else {
        return null;
    }
}


module.exports = { queryDatabaseMysql, insertUserIntoDatabase, findUserInDatabase, insertAbsenToday };
