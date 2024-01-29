const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox'],
    }
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
