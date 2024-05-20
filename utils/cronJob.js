const cron = require('node-cron');
const { queryDatabase } = require('./databaseHandler');
const { insertUserIntoDatabase, findUserInDatabase } = require('./mysqlHandler');
const { sendMessageIfCheckedInToday } = require('./messageSender');

async function setupCronJob() {
    console.log('Starting cron job:');
    try {
        cron.schedule('*/5 * * * * *', async () => {
            console.log('Cron job running...'); // Add this line for logging
            try {
                const currentDate = new Date().toISOString().split('T')[0];
                console.log('Current Date:', currentDate); // Add this line for logging
                const [checkInOutResult, userInfoResult] = await Promise.all([
                    queryDatabase(`SELECT USERID, CHECKTIME, statusMsg FROM CHECKINOUT WHERE FORMAT(CHECKTIME, 'YYYY-MM-DD') = '${currentDate}'`),
                    queryDatabase(`SELECT USERID, Name, OPHONE FROM USERINFO`)
                ]);
                //console.log('CheckInOut Result:', checkInOutResult); // Add this line for logging
                //console.log('UserInfo Result:', userInfoResult); // Add this line for logging

                if (checkInOutResult.length > 0) {
                    sendMessageIfCheckedInToday(checkInOutResult);
                    await Promise.all(userInfoResult.map(async (user) => {
                        if (!(await findUserInDatabase(user.USERID))) {
                            const newUser = {
                                uid: user.USERID,
                                name: user.Name,
                                ophone: user.OPHONE,
                            };
                            await insertUserIntoDatabase(newUser);
                        }
                    }));
                }
            } catch (error) {
                console.error('Database Error:', error);
            }
        });
    } catch (error) {
        console.error('Error setting up cron job:', error);
    }
}

module.exports = { setupCronJob };
