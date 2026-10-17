'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { REST, Routes } = require('discord.js');
const config = require('./config');
const { loadCommands } = require('./commands');
const logger = require('./core/logger');

const log = logger.createLogger('deploy');
const MARKER = path.join(config.dataDir, 'commands.hash');

/**
 * Returns raw JSON definitions for all loaded commands.
 * @returns {Array<any>}
 */
function commandBodies() {
    return [...loadCommands().values()].map((cmd) => cmd.data.toJSON());
}

/**
 * Register slash commands (guild-scoped when GUILD_ID is provided, global otherwise).
 * Skips redeployment if commands are unchanged since last deployment.
 * @param {{ force?: boolean }} [options]
 */
async function deployCommands({ force = false } = {}) {
    const { token, clientId, guildId } = config.discord;
    if (!token || !clientId) {
        throw new Error('DISCORD_TOKEN and CLIENT_ID must be set');
    }

    const body = commandBodies();
    const hash = crypto.createHash('sha256').update(JSON.stringify({ body, clientId, guildId })).digest('hex');

    if (!force && fs.existsSync(MARKER) && fs.readFileSync(MARKER, 'utf8') === hash) {
        log.debug('Slash commands unchanged; skipping deploy');
        return { skipped: true, count: body.length };
    }

    const rest = new REST().setToken(token);
    const route = guildId
        ? Routes.applicationGuildCommands(clientId, guildId)
        : Routes.applicationCommands(clientId);

    await rest.put(route, { body });
    fs.mkdirSync(config.dataDir, { recursive: true });
    fs.writeFileSync(MARKER, hash);
    log.info(`Registered ${body.length} slash commands ${guildId ? `in guild ${guildId}` : 'globally'}`);
    return { skipped: false, count: body.length };
}

if (require.main === module) {
    deployCommands({ force: true }).catch((err) => {
        log.error('Failed to deploy slash commands:', err);
        process.exit(1);
    });
}

module.exports = { deployCommands, commandBodies };
