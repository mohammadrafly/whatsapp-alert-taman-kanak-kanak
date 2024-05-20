const { queryDatabase, updateStatus } = require('./databaseHandler');
const { insertAbsenToday, getTime } = require('./mysqlHandler');
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
        const timeData = await getTime();
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
                const DateTime = new Date(absenInfo.CHECKTIME);

                console.log(absenInfo.CHECKTIME)
                const hour = DateTime.getHours().toString().padStart(2, '0');
                const minute = DateTime.getMinutes().toString().padStart(2, '0');

                const CHECKTIME = `${hour}:${minute}`
                if (timeData && timeData.start_time_enter && timeData.end_time_enter && timeData.start_time_leave && timeData.end_time_leave) {
                    const checkTime = CHECKTIME
                    const startTimeEnter = timeData.start_time_enter
                    const endTimeEnter = timeData.end_time_enter
                    const startTimeLeave = timeData.start_time_leave
                    const endTimeLeave = timeData.end_time_leave

                    console.log({
                        'absen': checkTime,
                        'start_enter': startTimeEnter,
                        'end_enter': endTimeEnter,
                        'start_leave': startTimeLeave,
                        'end_leave': endTimeLeave
                    });

                    if (checkTime >= startTimeEnter && checkTime <= endTimeEnter) {
                        checkType = 'I'; 
                    } else if (checkTime >= startTimeLeave && checkTime <= endTimeLeave) {
                        checkType = 'O'; 
                    }

                    console.log('Check Type:', checkType);
                } else {
                    console.log('Insufficient data in the database');
                }

                console.log(checkType);
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
                console.log('No absen information found for CHECKTYPE with statusMsg 0.');
            }
        }
    } catch (error) {
        console.error('Error checking and sending message:', error);
    }
}

module.exports = { sendMessageIfCheckedInToday };
