const { client } = require('./utils/clientHandler');
const qrcode = require('qrcode-terminal');
const { setupCronJob } = require('./utils/cronJob');

client.on('qr', qr => {
    console.log('QR code received');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
    setupCronJob();
});

client.on('error', (err) => {
    console.error('Client error:', err);
});

try {
    client.initialize();
} catch (error) {
    console.error('Initialization error:', error);
}
