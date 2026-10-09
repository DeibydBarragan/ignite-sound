'use strict';

const { SlashCommandBuilder } = require('discord.js');
const voiceManager = require('../voice/voiceManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Desconecta al bot del canal de voz.'),

    async execute(interaction) {
        const memberVoiceChannel = interaction.member?.voice?.channel;
        if (!memberVoiceChannel) {
            return interaction.reply({
                content: '❌ Debes estar en un canal de voz para desconectar al bot.',
                ephemeral: true,
            });
        }

        voiceManager.leave(interaction.guildId);

        return interaction.reply({
            content: '👋 Me he desconectado del canal de voz.',
        });
    },
};
