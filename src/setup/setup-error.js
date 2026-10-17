'use strict';

/**
 * Thrown by startup checks (bootstrap, preflight) when the bot cannot run
 * until configuration or environment issues are resolved.
 */
class SetupError extends Error {
    /**
     * @param {number} [problems=1]
     */
    constructor(problems = 1) {
        super(`The bot was not started: ${problems} problem(s) must be fixed first.`);
        this.name = 'SetupError';
        this.problems = problems;
    }
}

module.exports = { SetupError };
