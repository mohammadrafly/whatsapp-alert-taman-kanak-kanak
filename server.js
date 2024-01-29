// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { client, generateQRCode } = require('./clientHandler');
const { connection } = require('./databaseHandler');
const { setupCronJob } = require('./cronJob');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

let latestData = null; 

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

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

client.on('authenticated', (session) => {
    console.log(`You are now authenticated. Session: ${JSON.stringify(session)}`);
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.initialize();
setupCronJob();
