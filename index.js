const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const bodyParser = require('body-parser');
const ADODB = require('node-adodb');
const cron = require('node-cron');

app.use(cors());
app.use(bodyParser.json());

const connection = ADODB.open('Provider=Microsoft.Jet.OLEDB.4.0;Data Source=C:\\Program Files (x86)\\Att\\att2000.mdb;');

const client = new Client({
    auth: new LocalAuth(),
});

client.setMaxListeners(15);

let latestData = null; 

const sendMessageIfCheckedInToday = async () => {
    try {
        if (latestData && latestData.length > 0) {
            const userId = latestData[0].USERID;

            const currentDate = new Date().toISOString().split('T')[0];

            const checkinTodayQuery = `
                SELECT *
                FROM CHECKINOUT
                WHERE USERID = ${userId} AND FORMAT(CHECKTIME, 'YYYY-MM-DD') >= '${currentDate}'`;
                        
            const checkinTodayResult = await connection.query(checkinTodayQuery);            

            if (checkinTodayResult && checkinTodayResult.length > 0) {
                const userInfoQuery = `SELECT OPHONE FROM USERINFO WHERE USERID = ${userId}`;
                const userStatusMsg = `SELECT statusMsg FROM CHECKINOUT WHERE USERID = ${userId}`;
                const userInfoResult = await connection.query(userInfoQuery);
                const msgInfoResult = await connection.query(userStatusMsg);

                if (userInfoResult && userInfoResult.length > 0) {
                    const recipientNumber = userInfoResult[0].OPHONE;
                    const statusMsg = msgInfoResult[0].statusMsg;

                    if (statusMsg === 0) {
                        client.on('ready', async () => {
                            const message = 'Anak anda sudah absen!';
                            await client.sendMessage(`${recipientNumber}@c.us`, message);
                        });

                        console.log('WhatsApp message sent to', recipientNumber);

                        const updateStatusQuery = `UPDATE CHECKINOUT SET statusMsg = 1 WHERE USERID = ${userId}`;
                        await connection.query(updateStatusQuery);
                    } else {
                        console.log('No need to send message. User has already received a message or statusMsg is not set.');
                    }
                }
            } else {
                console.log('No need to send message. User has not checked in today.');
            }
        }
    } catch (error) {
        console.error('Error checking and sending message:', error);
    }
};

cron.schedule('*/10 * * * * *', async () => {
    try {
        const currentDate = new Date().toISOString().split('T')[0];
        const result = await connection.query(`SELECT USERID, CHECKTIME FROM CHECKINOUT WHERE FORMAT(CHECKTIME, 'YYYY-MM-DD') >= '${currentDate}'`);
        latestData = result;

        if (result && result.length > 0) {
            await sendMessageIfCheckedInToday();
        } else {
            console.log('No data found for the current date.');
        }
    } catch (error) {
        console.error('Database Error:', error);
    }
});

app.get('/', async (req, res) => {
    try {
        client.getState('connection').then(connectionStatus => {
            if (connectionStatus !== 'CONNECTED') {
                client.on('qr', async (qr) => {
                    try {
                        const qrcodeData = await generateQRCode(qr);
                        res.send(`<div id="qrcode-container"><pre>${qrcodeData}</pre></div>`);
                    } catch (error) {
                        console.error(error);
                        res.status(500).send('Internal Server Error');
                    } finally {
                        client.removeAllListeners('qr');
                    }
                });
            } else {
                res.send(`<div id="success-message">You are now logged in! Connection Status: ${JSON.stringify(connectionStatus)}</div>`);
                console.log(`QR Code scanned successfully. You are now authenticated. Connection Status: ${connectionStatus}`);
            }
        });
    } catch (error) {
        res.send(`<div id="error-message">Error: ${error.message}</div>`);
    }
});

app.get('/read', async (req, res) => {
    try {
        const result = await connection.query('SELECT USERID, Name, OPHONE FROM USERINFO');
        res.json(result);
    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/latest-data', async (req, res) => {
    try {
        if (latestData && latestData.length > 0) {
            const userIds = latestData.map(entry => entry.USERID);
            const userInfoQuery = `SELECT USERID, Name, OPHONE FROM USERINFO WHERE USERID IN (${userIds.join(',')})`;
            const userInfoResult = await connection.query(userInfoQuery);

            const userInfoMap = userInfoResult.reduce((acc, userInfo) => {
                acc[userInfo.USERID] = userInfo;
                return acc;
            }, {});

            const enrichedData = latestData.map(entry => ({
                ...entry,
                userInfo: userInfoMap[entry.USERID] || null,
            }));

            res.json({ data: enrichedData });
            //console.log(enrichedData)
        } else {
            res.json({ data: [] }); 
        }
    } catch (error) {
        console.error('Error fetching latest data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.get('/messages', (req, res) => {
    client.on('message', (message) => {
        res.json({ message: { body: message.body, timestamp: message.timestamp, sender: message.from } });
        client.removeAllListeners('message');
    });
});

client.on('authenticated', (session) => {
    console.log(`You are now authenticated. Session: ${JSON.stringify(session)}`);
});

client.initialize().catch((error) => {
    console.error('Initialization failed:', error.message);
});

async function generateQRCode(data) {
    return new Promise((resolve, reject) => {
        qrcode.generate(data, { small: true }, (qrcode) => {
            resolve(qrcode);
        }, (error) => {
            reject(error);
        });
    });
}

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});