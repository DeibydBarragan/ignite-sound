'use strict';

const config = require('../../../config');
const { ApiError } = require('../../contracts');

/**
 * Resolves guild and target voice channel:
 * 1) explicit channelId
 * 2) bot's current voice channel
 * 3) first channel with active non-bot users
 * 4) first available voice channel
 */
function resolveVoiceTarget(client, guildId, channelId) {
    if (!client) {
        throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'El cliente de Discord no está listo.');
    }
    const targetGuildId = guildId || config.discord.guildId || client.guilds?.cache.first()?.id;
    if (!targetGuildId) {
        throw new ApiError(400, 'GUILD_REQUIRED', 'No se especificó un servidor de Discord.');
    }
    const guild = client.guilds.cache.get(targetGuildId);
    if (!guild) {
        throw new ApiError(404, 'GUILD_NOT_FOUND', `Servidor con ID ${targetGuildId} no encontrado.`);
    }

    let voiceChannel = null;
    if (channelId) {
        voiceChannel = guild.channels.cache.get(channelId) || null;
    }
    if (!voiceChannel) {
        const botVoiceState = guild.members.me?.voice;
        if (botVoiceState?.channel) {
            voiceChannel = botVoiceState.channel;
        } else {
            const hasRealUser = (c) =>
                c.isVoiceBased() &&
                c.members.filter((m) => m?.user && m.user.bot === false).size > 0;
            voiceChannel =
                guild.channels.cache.find(hasRealUser) ||
                guild.channels.cache.find((c) => c.isVoiceBased()) ||
                null;
        }
    }
    if (!voiceChannel) {
        throw new ApiError(400, 'NO_VOICE_CHANNEL', 'No se encontró un canal de voz activo en el servidor.');
    }
    return { guild, voiceChannel };
}

module.exports = { resolveVoiceTarget };
