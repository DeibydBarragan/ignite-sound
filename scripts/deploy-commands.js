'use strict';

require('../src/core/dns-fix');

const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');
const config = require('../src/config');

async function deploy() {
    const { token, clientId, guildId } = config.discord;

    if (!token || !clientId) {
        console.error('❌ DISCORD_TOKEN y CLIENT_ID deben estar configurados en .env para desplegar comandos.');
        process.exit(1);
    }

    const commandsPath = path.join(__dirname, '..', 'src', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
    const commands = [];

    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        if (command.data) {
            commands.push(command.data.toJSON());
        }
    }

    console.log(`[Deploy] Cargando ${commands.length} comandos slash...`);

    const rest = new REST({ version: '10' }).setToken(token);

    try {
        const route = guildId
            ? Routes.applicationGuildCommands(clientId, guildId)
            : Routes.applicationCommands(clientId);

        await rest.put(route, { body: commands });

        console.log(`✅ ${commands.length} comandos registrados con éxito ${guildId ? `en el servidor ${guildId}` : 'globalmente'}.`);
    } catch (error) {
        console.error('❌ Error al registrar los comandos:', error);
        process.exit(1);
    }
}

deploy();
