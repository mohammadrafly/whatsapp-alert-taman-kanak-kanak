const { Client, LocalAuth } = require('whatsapp-web.js');
const wwebVersion = '2.2412.54';

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {},
    webVersionCache: {
        type: 'remote',
        remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/${wwebVersion}.html`,
    },
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

module.exports = { client };
