'use strict';

const { SlashCommandBuilder } = require('discord.js');
const voiceManager = require('../voice/voiceManager');
const { getMemberVoiceChannel, replyEphemeral } = require('./_shared');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Desconecta al bot del canal de voz.'),

    async execute(interaction) {
        const memberVoiceChannel = getMemberVoiceChannel(interaction);
        if (!memberVoiceChannel) {
            return replyEphemeral(interaction, '❌ Debes estar en un canal de voz para desconectar al bot.');
        }

        voiceManager.leave(interaction.guildId);

        return interaction.reply({
            content: '👋 Me he desconectado del canal de voz.',
        });
    },
};
