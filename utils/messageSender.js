const { queryDatabase , updateStatus} = require('./databaseHandler');
const { insertAbsenToday } = require('./mysqlHandler');
const { client } = require('./clientHandler');
const fs = require('fs');

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

function readDataFromFile() {
    try {
        const data = fs.readFileSync('data.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading data from file:', error);
        return null;
    }
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
        const timeData = readDataFromFile();
        let checkType;

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
            
            const absenInfo = msgInfoResult.find(item => item.statusMsg === 0);

            if (absenInfo) {
                const dateObject = new Date(absenInfo.CHECKTIME);

                const hour = dateObject.getHours();
                const minutes = dateObject.getMinutes();

                const CHECKTIME = `${hour}:${minutes}`;

                if (timeData && timeData.start_time_enter && timeData.end_time_enter && timeData.start_time_leave && timeData.end_time_leave && timeData.time_check_in) {
                    const checkTime = CHECKTIME
                    const startTimeEnter = timeData.start_time_enter
                    const endTimeEnter = timeData.end_time_enter
                    const startTimeLeave = timeData.start_time_leave
                    const endTimeLeave = timeData.end_time_leave
                    
                    console.log({
                        'absen': checkTime,
                        'start': startTimeEnter
                    })
                    if (checkTime >= startTimeEnter && checkTime <= endTimeEnter) {
                        checkType = 'I'; 
                    } else if (checkTime >= startTimeLeave && checkTime <= endTimeLeave) {
                        checkType = 'O';
                    } else {
                        console.log('Outside of check-in and check-out times');
                    }
                } else {
                    console.log('Insufficient data in data.json');
                }

                console.log(checkType)
                const recipientNumber = userInfoResult[0].OPHONE;
                const responseMessage = `${userInfoResult[0].Name} telah absen ${checkType === 'I' ? 'masuk' : 'pulang'} pada ${formatDateTime(absenInfo.CHECKTIME)}.`;

                try {
                    await client.sendMessage(`${recipientNumber}@c.us`, responseMessage);
                    console.log('WhatsApp message sent to', recipientNumber);

                    const newAbsen = { 
                        uid: absenInfo.USERID,
                        statusMsg: 1,
                        checkType: checkType,
                        created_at: formatDate(absenInfo.CHECKTIME),
                        updated_at: formatDate(absenInfo.CHECKTIME)
                    };

                    console.log(newAbsen);
                    await updateStatus(userId, currentDate);
                    await insertAbsenToday(newAbsen);
                } catch (error) {
                    console.error('Error sending WhatsApp message:', error);
                }
            } else {
                console.log(`No absen information found for CHECKTYPE "${desiredCheckTypes.join('" or "')}" with statusMsg 0.`);
            }
        }
    } catch (error) {
        console.error('Error checking and sending message:', error);
    }
}

module.exports = { sendMessageIfCheckedInToday };