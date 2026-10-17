'use strict';

require('../src/core/dns-fix');

const { deployCommands } = require('../src/deploy');

deployCommands({ force: true }).catch((err) => {
    console.error('Failed to deploy slash commands:', err);
    process.exit(1);
});
