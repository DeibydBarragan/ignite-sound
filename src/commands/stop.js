'use strict';

const { SlashCommandBuilder } = require('discord.js');
const voiceManager = require('../voice/voiceManager');
const { getMemberVoiceChannel, replyEphemeral } = require('./_shared');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Detiene la reproducción de voz actual y vacía la cola de TTS.'),

    async execute(interaction) {
        const memberVoiceChannel = getMemberVoiceChannel(interaction);
        if (!memberVoiceChannel) {
            return replyEphemeral(interaction, '❌ Debes estar en el canal de voz para detener la reproducción.');
        }

        const session = voiceManager.getSession(interaction.guildId);
        session.stop();

        return interaction.reply({
            content: '⏹️ Reproducción detenida y cola de TTS vaciada.',
        });
    },
};
