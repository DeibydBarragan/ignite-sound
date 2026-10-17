'use strict';

const { format } = require('node:util');
const config = require('../config');
const pino = require('pino');

const useColor = Boolean(process.stdout.isTTY) && !config.noColor;
const isProduction = process.env.NODE_ENV === 'production';

let debugEnabled = false;

/**
 * JSON lines in production, colorized and readable on developer terminal.
 */
const root = pino(
    {
        base: undefined,
        timestamp: pino.stdTimeFunctions.isoTime,
        customLevels: { ok: 35 },
        level: 'debug',
        formatters: { level: (label) => ({ level: label }) },
    },
    isProduction || !useColor
        ? pino.destination({ dest: 1, sync: true })
        : require('pino-pretty')({ colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' }),
);

/**
 * Rebuild message with util.format and hoist Error into err field
 * so full stack traces always reach the log collectors.
 *
 * @param {any[]} args
 * @returns {any[]}
 */
function normalize(args) {
    const error = args.find((arg) => arg instanceof Error);
    if (!error) return [format(...args)];
    const values = args.filter((arg) => arg !== error);
    return [{ err: error }, values.length ? format(...values) : error.message];
}

/**
 * @param {string} scope
 * @returns {any}
 */
function createLogger(scope) {
    const logger = /** @type {any} */ (scope ? root.child({ scope }) : root);
    return {
        debug: (...args) => {
            if (debugEnabled) logger.debug(...normalize(args));
        },
        info: (...args) => logger.info(...normalize(args)),
        ok: (...args) => logger.ok(...normalize(args)),
        warn: (...args) => logger.warn(...normalize(args)),
        error: (...args) => logger.error(...normalize(args)),
        child: (sub) => createLogger(scope ? `${scope}:${sub}` : sub),
    };
}

const logger = createLogger('');
logger.createLogger = createLogger;
logger.setDebug = (value) => {
    debugEnabled = Boolean(value);
};

module.exports = logger;
