'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { Collection } = require('discord.js');

/**
 * Loads all command modules in this directory into a Discord Collection.
 * Ignores helper files starting with '_' and 'index.js'.
 * @returns {Collection<string, any>}
 */
function loadCommands() {
    const commands = new Collection();
    const files = fs.readdirSync(__dirname).sort();

    for (const file of files) {
        if (!file.endsWith('.js') || file.startsWith('_') || file === 'index.js') continue;
        const command = require(path.join(__dirname, file));
        if (!command?.data || typeof command.execute !== 'function') {
            throw new Error(`Invalid command module: ${file}`);
        }
        if (commands.has(command.data.name)) {
            throw new Error(`Duplicate command name: ${command.data.name}`);
        }
        commands.set(command.data.name, command);
    }

    return commands;
}

module.exports = { loadCommands };
