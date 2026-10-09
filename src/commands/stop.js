'use strict';

const { SlashCommandBuilder } = require('discord.js');
const voiceManager = require('../voice/voiceManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Detiene la reproducción de voz actual y vacía la cola de TTS.'),

    async execute(interaction) {
        const memberVoiceChannel = interaction.member?.voice?.channel;
        if (!memberVoiceChannel) {
            return interaction.reply({
                content: '❌ Debes estar en el canal de voz para detener la reproducción.',
                ephemeral: true,
            });
        }

        const session = voiceManager.getSession(interaction.guildId);
        session.stop();

        return interaction.reply({
            content: '⏹️ Reproducción detenida y cola de TTS vaciada.',
        });
    },
};
