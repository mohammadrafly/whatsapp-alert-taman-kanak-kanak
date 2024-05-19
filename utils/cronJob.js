const cron = require('node-cron');
const { queryDatabase } = require('./databaseHandler');
const { insertUserIntoDatabase, findUserInDatabase } = require('../mysqlHandler');
const { sendMessageIfCheckedInToday } = require('./messageSender');

async function setupCronJob() {
    try {
        cron.schedule('*/5 * * * * *', async () => {
            try {
                const currentDate = new Date().toISOString().split('T')[0];

                const result = await queryDatabase(`SELECT USERID, CHECKTIME, statusMsg FROM CHECKINOUT WHERE FORMAT(CHECKTIME, 'YYYY-MM-DD') >= '${currentDate}'`);

                const latestData = result; 

                if (result && result.length > 0) { 
                    sendMessageIfCheckedInToday(latestData);

                    const allData = await queryDatabase(`SELECT USERID, Name, OPHONE FROM USERINFO`);

                    for (const user of allData) {
                        if (!await findUserInDatabase(user.USERID)) {
                            const newUser = { 
                                uid: user.USERID,
                                name: user.Name,
                                ophone: user.OPHONE,
                            };

                            try {
                                await insertUserIntoDatabase(newUser);
                            } catch (error) {
                                console.error(`Error processing user with UID ${newUser.uid}:`, error);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Kesalahan Database:', error);
            }
        });
    } catch (error) {
        console.error('Kesalahan dalam menyiapkan pekerjaan cron:', error);
    }
}

module.exports = { setupCronJob };
