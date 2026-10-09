'use strict';

require('./src/core/dns-fix');

const SoundBot = require('./src/core/bot');

const bot = new SoundBot();
bot.start().catch((err) => {
    console.error('❌ Error al iniciar el bot:', err);
    process.exit(1);
});
