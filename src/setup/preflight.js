'use strict';

const config = require('../config');
const report = require('./report');
const {
    MIN_API_SECRET_LENGTH,
    SNOWFLAKE,
    TOKEN,
    TOKEN_STEPS,
    ensureEnvFile,
    checkToken,
    canWrite,
    loads,
} = require('./preflight-checks');

/**
 * Execute preflight checks for configuration, environment, Discord token, and permissions.
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
async function run({ fetchImpl = fetch } = {}) {
    let problems = 0;
    const fail = (label, lines = []) => {
        problems++;
        report.fail(label, lines);
    };

    if (ensureEnvFile()) {
        fail('A .env file was created for you, but it still needs your bot token', TOKEN_STEPS);
        report.stop(problems);
    }

    const { token } = config.discord;
    if (!token) {
        fail('DISCORD_TOKEN is empty', TOKEN_STEPS);
    } else if (!TOKEN.test(token)) {
        fail('DISCORD_TOKEN does not match bot token pattern', [
            'Make sure you copied the token without spaces or quotes.',
            ...TOKEN_STEPS,
        ]);
    } else {
        const result = await checkToken(token, fetchImpl);
        if (result.ok) {
            const app = result.application;
            const name = app?.bot?.username || app?.name || 'Bot';
            if (config.discord.clientId && config.discord.clientId !== app?.id) {
                report.warn(`CLIENT_ID in .env (${config.discord.clientId}) differs from application (${app?.id})`, [
                    `Using application id instead: ${app?.id}.`,
                ]);
            }
            if (app?.id) {
                process.env.CLIENT_ID = app.id;
            }
            report.ok('Discord token', `${name} (application ${app?.id || 'unknown'})`);
        } else if (result.reason === 'invalid') {
            fail('Discord rejected DISCORD_TOKEN (wrong or revoked token)', TOKEN_STEPS);
        } else {
            if (!config.discord.clientId) {
                fail('Could not reach Discord API to check token', [
                    `Reason: ${result.detail}`,
                    'Check your internet connection and proxy/firewall settings.',
                ]);
            } else {
                report.warn('Could not reach Discord API to check token; proceeding anyway', [
                    `Reason: ${result.detail}`,
                ]);
            }
        }
    }

    if (config.discord.guildId && !SNOWFLAKE.test(config.discord.guildId)) {
        fail(`GUILD_ID "${config.discord.guildId}" is not a valid Discord snowflake ID`, [
            'Leave GUILD_ID empty to register slash commands globally, or provide a numeric server ID.',
        ]);
    }

    if (!canWrite(config.dataDir)) {
        fail(`Cannot write to ${config.dataDir}`, [
            'The bot saves soundboard metadata and user voice preferences there.',
        ]);
    }

    if (config.api.enabled) {
        if ((config.api.secret || '').length < MIN_API_SECRET_LENGTH) {
            fail(`API_SECRET is missing or too short (minimum ${MIN_API_SECRET_LENGTH} characters)`, [
                'The REST API requires a strong secret in production.',
                'Generate one: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
            ]);
        } else {
            report.ok('API secret', `configured (${MIN_API_SECRET_LENGTH}+ characters)`);
        }
    }

    if (loads('@discordjs/opus')) {
        report.ok('Audio codec', '@discordjs/opus (native performance)');
    } else {
        report.warn('Audio codec', 'Falling back to javascript opus encoder');
    }

    if (problems > 0) {
        report.stop(problems);
    }
}

module.exports = { run };
