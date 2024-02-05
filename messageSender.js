const { queryDatabase , updateStatus} = require('./databaseHandler');
const { insertAbsenToday } = require('./mysqlHandler');
const { client } = require('./clientHandler');

function formatDateTime(dateTimeString) {
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    };

    const dateTime = new Date(dateTimeString);
    return dateTime.toLocaleString('id-ID', options);
}

const formatDate = (date) => {
    const formattedDate = new Date(date);
    const year = formattedDate.getFullYear();
    const month = String(formattedDate.getMonth() + 1).padStart(2, '0');
    const day = String(formattedDate.getDate()).padStart(2, '0');
    const hours = String(formattedDate.getHours()).padStart(2, '0');
    const minutes = String(formattedDate.getMinutes()).padStart(2, '0');
    const seconds = String(formattedDate.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

async function sendMessageIfCheckedInToday(latestData) {
    try {
        if (!latestData || latestData.length === 0) {
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const filteredData = latestData.filter(item => item.statusMsg === 0 && item.CHECKTIME.startsWith(today));

        if (filteredData.length === 0) {
            return;
        }

        const userId = filteredData[0].USERID;
        const currentDate = new Date().toISOString().split('T')[0];

        const checkinTodayQuery = `
            SELECT *
            FROM CHECKINOUT
            WHERE USERID = ${userId}
            AND FORMAT(CHECKTIME, 'YYYY-MM-DD') >= '${currentDate}'
        `;

        const checkinTodayResult = await queryDatabase(checkinTodayQuery);

        if (!checkinTodayResult || checkinTodayResult.length === 0) {
            return;
        }

        const userInfoQuery = `SELECT OPHONE, Name FROM USERINFO WHERE USERID = ${userId}`;

        const userInfoResult = await queryDatabase(userInfoQuery);
        const msgInfoResult = await queryDatabase(checkinTodayQuery);

        if (userInfoResult && userInfoResult.length > 0) {
            if (msgInfoResult[0].statusMsg === 0) {
                const recipientNumber = userInfoResult[0].OPHONE;
                const statusMsg = msgInfoResult[0].statusMsg;
                if (statusMsg === 0) {
                    const responseMessage = `${userInfoResult[0].Name} telah absen masuk pada ${formatDateTime(msgInfoResult[0].CHECKTIME)}.`;

                    try {
                        await client.sendMessage(`${recipientNumber}@c.us`, responseMessage);
                        console.log('WhatsApp message sent to', recipientNumber);
                        
                        const newAbsen = {
                            uid: msgInfoResult[0].USERID,
                            statusMsg: 1,
                            checkType: msgInfoResult[0].CHECKTYPE,
                            created_at: formatDate(msgInfoResult[0].CHECKTIME),
                            updated_at: formatDate(msgInfoResult[0].CHECKTIME)
                        };
                        
                        console.log(newAbsen);
                        await updateStatus(userId, currentDate);
                        await insertAbsenToday(newAbsen);
                    } catch (error) {
                        console.error('Error sending WhatsApp message:', error);
                    }
                } else {
                    console.log('No need to send message. User has already received a message or statusMsg is not set.');
                }
            } else if (msgInfoResult[1].statusMsg === 0) {
                const recipientNumber = userInfoResult[0].OPHONE;
                const statusMsg = msgInfoResult[1].statusMsg;
                if (statusMsg === 0) {
                    const responseMessage = `${userInfoResult[0].Name} telah absen pulang pada ${formatDateTime(msgInfoResult[1].CHECKTIME)}.`;

                    try {
                        await client.sendMessage(`${recipientNumber}@c.us`, responseMessage);
                        console.log('WhatsApp message sent to', recipientNumber);

                        const newAbsen = {
                            uid: msgInfoResult[1].USERID,
                            statusMsg: 1,
                            checkType: msgInfoResult[1].CHECKTYPE,
                            created_at: formatDate(msgInfoResult[1].CHECKTIME),
                            updated_at: formatDate(msgInfoResult[1].CHECKTIME)
                        };
                        
                        console.log(newAbsen);
                        await updateStatus(userId, currentDate);
                        await insertAbsenToday(newAbsen);
                    } catch (error) {
                        console.error('Error sending WhatsApp message:', error);
                    }
                } else {
                    console.log('No need to send message. User has already received a message or statusMsg is not set.');
                }
            }
        }
    } catch (error) {
        console.error('Error checking and sending message:', error);
    }
}

module.exports = { sendMessageIfCheckedInToday };