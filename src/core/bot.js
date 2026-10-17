'use strict';

const { createClient, start } = require('../bot');

/**
 * Backward compatibility bridge for SoundBot class.
 */
class SoundBot {
    constructor() {
        this.client = createClient();
    }

    async start() {
        return start();
    }
}

module.exports = SoundBot;
