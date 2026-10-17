'use strict';

require('../core/dns-fix');

const preflight = require('./preflight');
const { SetupError } = require('./setup-error');
const { deployCommands } = require('../deploy');
const { start } = require('../bot');
const logger = require('../core/logger');

const log = logger.createLogger('launcher');

/**
 * Main application launcher: preflight checks -> command deploy -> bot gateway start.
 */
async function main() {
    await preflight.run();

    try {
        await deployCommands();
    } catch (err) {
        log.warn('Slash command deployment encountered an error:', err.message);
    }

    return start();
}

module.exports = {
    main: () =>
        main().catch((err) => {
            if (err instanceof SetupError) {
                process.exit(1);
            }
            log.error('Failed to start ignite-sound:', err);
            process.exit(1);
        }),
};
