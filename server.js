const { client } = require('./utils/clientHandler');
const qrcode = require('qrcode-terminal');
const { setupCronJob } = require('./utils/cronJob');

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.initialize();
setupCronJob(); 