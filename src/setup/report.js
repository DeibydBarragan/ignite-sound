'use strict';

/**
 * Startup checklist and diagnostic output.
 * Uses only Node.js built-ins and reads the environment directly.
 */
const { SetupError } = require('./setup-error');

const color = Boolean(process.stdout.isTTY && !process.env.NO_COLOR);
const paint = (code, text) => (color ? `\x1b[${code}m${text}\x1b[0m` : text);

const report = {
    title(text) {
        console.log(`\n${paint('1', text)}\n`);
    },
    ok(label, detail = '') {
        console.log(`  ${paint('32', '[ OK ]')} ${label}${detail ? paint('90', `  ${detail}`) : ''}`);
    },
    info(label, detail = '') {
        console.log(`  ${paint('36', '[INFO]')} ${label}${detail ? paint('90', `  ${detail}`) : ''}`);
    },
    warn(label, lines = []) {
        console.error(`  ${paint('33', '[WARN]')} ${label}`);
        for (const line of [].concat(lines)) {
            console.error(`         ${line}`);
        }
    },
    fail(label, lines = []) {
        console.error(`  ${paint('31', '[FAIL]')} ${paint('1', label)}`);
        for (const line of [].concat(lines)) {
            console.error(`         ${line}`);
        }
    },
    /**
     * Report fatal issues and throw SetupError.
     * @param {number} problems
     */
    stop(problems) {
        console.error(`\n${paint('31;1', `The bot was not started: ${problems} problem(s) above must be fixed first.`)}`);
        console.error('Fix them and start the bot again.\n');
        throw new SetupError(problems);
    },
};

module.exports = report;
