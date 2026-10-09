'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { Client, GatewayIntentBits, Collection, ActivityType, MessageFlags } = require('discord.js');
const config = require('../config');
const { createApiServer } = require('../api/server');
const voiceManager = require('../voice/voiceManager');

class SoundBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildMessages,
            ],
        });

        this.client.commands = new Collection();
        this.loadCommands();
        voiceManager.setClient(this.client);
        this.setupEvents();
    }

    loadCommands() {
        const commandsPath = path.join(__dirname, '..', 'commands');
        if (!fs.existsSync(commandsPath)) return;

        const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
        for (const file of commandFiles) {
            const command = require(path.join(commandsPath, file));
            if (command.data && command.execute) {
                this.client.commands.set(command.data.name, command);
            }
        }
    }

    setupEvents() {
        this.client.once('clientReady', () => {
            console.log(`[Bot] Conectado exitosamente como ${this.client.user.tag}`);
            this.client.user.setActivity(config.bot.status, { type: ActivityType.Custom });

            // Iniciar servidor API HTTP para ignite-frontend
            const apiApp = createApiServer(this.client);
            apiApp.listen(config.api.port, () => {
                console.log(`[API] Servidor HTTP REST escuchando en http://localhost:${config.api.port}`);
            });
        });

        // Salir solo si el bot queda solo en el canal durante LEAVE_ON_EMPTY segundos
        this.client.on('voiceStateUpdate', (oldState, newState) => {
            voiceManager.handleVoiceStateUpdate(oldState, newState);
        });

        this.client.on('interactionCreate', async (interaction) => {
            if (interaction.isAutocomplete()) {
                const command = this.client.commands.get(interaction.commandName);
                if (!command || !command.autocomplete) return;

                try {
                    await command.autocomplete(interaction);
                } catch (err) {
                    console.error(`[Autocomplete Error] en ${interaction.commandName}:`, err);
                }
                return;
            }

            if (!interaction.isChatInputCommand()) return;

            const command = this.client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (err) {
                console.error(`[Command Error] en ${interaction.commandName}:`, err);
                const replyMethod = interaction.replied || interaction.deferred ? 'followUp' : 'reply';
                await interaction[replyMethod]({
                    content: '❌ Ocurrió un error inesperado al procesar este comando.',
                    flags: MessageFlags.Ephemeral,
                }).catch(() => {});
            }
        });
    }

    async start() {
        if (!config.discord.token) {
            console.error('❌ DISCORD_TOKEN no está definido en el archivo .env');
            process.exit(1);
        }

        await this.client.login(config.discord.token);
    }
}

module.exports = SoundBot;
