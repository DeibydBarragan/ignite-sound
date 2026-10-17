'use strict';

require('./core/dns-fix');

const {
    ActivityType,
    Client,
    Events,
    GatewayIntentBits,
    MessageFlags,
} = require('discord.js');
const config = require('./config');
const logger = require('./core/logger');
const { loadCommands } = require('./commands');
const { createApiServer } = require('./api/server');
const voiceManager = require('./voice/voice-manager');

const log = logger.createLogger('bot');

/**
 * Creates and configures the Discord client instance.
 * @returns {Client & { commands: any, commandIds: Map<string, string>, apiServer?: any, shutdown: () => Promise<boolean> }}
 */
function createClient() {
    // @ts-ignore - augmented discord client
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildMessages,
        ],
        presence: {
            activities: [{ name: config.bot.status, type: ActivityType.Custom }],
        },
    });

    client.commands = loadCommands();
    client.commandIds = new Map();
    voiceManager.setClient(client);

    client.on(Events.VoiceStateUpdate, (oldState, newState) => {
        voiceManager.handleVoiceStateUpdate(oldState, newState);
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            if (!command?.autocomplete) return;

            try {
                await command.autocomplete(interaction);
            } catch (err) {
                log.error(`Autocomplete error in /${interaction.commandName}:`, err);
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (err) {
            log.error(`Command error in /${interaction.commandName}:`, err);
            const replyMethod = interaction.replied || interaction.deferred ? 'followUp' : 'reply';
            await interaction[replyMethod]({
                content: '❌ Ocurrió un error inesperado al procesar este comando.',
                flags: MessageFlags.Ephemeral,
            }).catch(() => {});
        }
    });

    client.on(Events.Error, (err) => log.error('Discord client error:', err));
    client.on(Events.Warn, (msg) => log.warn('Discord client warn:', msg));

    client.once(Events.ClientReady, async (ready) => {
        log.info(`Conectado exitosamente como ${ready.user.tag}`);

        try {
            const commands = await ready.application.commands.fetch(
                config.discord.guildId ? { guildId: config.discord.guildId } : {}
            );
            for (const cmd of commands.values()) {
                client.commandIds.set(cmd.name, cmd.id);
            }
        } catch (err) {
            log.warn('Could not fetch command ids:', err.message);
        }

        if (config.api.enabled) {
            const app = createApiServer(client);
            client.apiServer = app.listen(config.api.port, () => {
                log.info(`REST API escuchando en http://localhost:${config.api.port}`);
            });
        }
    });

    let stopping = null;
    client.shutdown = () => {
        stopping ??= (async () => {
            log.info('Shutting down bot and services...');
            if (client.apiServer) {
                client.apiServer.close();
                client.apiServer.closeAllConnections?.();
            }
            voiceManager.leaveAll();
            await client.destroy();
            return true;
        })();
        return stopping;
    };

    return client;
}

/**
 * Starts the bot client and attaches process lifecycle handlers.
 */
async function start() {
    if (!config.discord.token) {
        log.error('DISCORD_TOKEN is missing. Please define it in your .env file.');
        process.exit(1);
    }

    const client = createClient();

    const exit = async (code = 0) => {
        await client.shutdown();
        process.exit(code);
    };

    process.once('SIGINT', () => exit(0));
    process.once('SIGTERM', () => exit(0));

    process.on('unhandledRejection', (reason) => log.error('Unhandled rejection:', reason));
    process.on('uncaughtException', (err) => {
        log.error('Uncaught exception:', err);
        exit(1);
    });

    await client.login(config.discord.token);
    return client;
}

if (require.main === module) {
    start();
}

module.exports = { createClient, start };
