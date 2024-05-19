const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const wwebVersion = '2.2412.54';

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {},
    webVersionCache: {
        type: 'remote',
        remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/${wwebVersion}.html`,
    },
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

module.exports = { client, generateQRCode };
