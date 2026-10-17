'use strict';

const { MessageFlags, PermissionsBitField } = require('discord.js');

/**
 * Validates that an interaction member is in a voice channel.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @returns {import('discord.js').VoiceBasedChannel | null}
 */
function getMemberVoiceChannel(interaction) {
    // @ts-ignore - discord.js guild member voice state
    return interaction.member?.voice?.channel || null;
}

/**
 * Checks if the bot client has permissions to join and speak in the given channel.
 * @param {import('discord.js').VoiceBasedChannel} channel
 * @param {import('discord.js').User | null} clientUser
 * @returns {boolean}
 */
function hasVoicePermissions(channel, clientUser) {
    if (!channel || !clientUser) return false;
    const perms = channel.permissionsFor(clientUser);
    if (!perms) return false;
    return perms.has(PermissionsBitField.Flags.Connect) && perms.has(PermissionsBitField.Flags.Speak);
}

/**
 * Sends or follows up with an ephemeral reply.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {string | import('discord.js').InteractionReplyOptions} options
 */
async function replyEphemeral(interaction, options) {
    const payload = typeof options === 'string' ? { content: options } : { ...options };
    payload.flags = MessageFlags.Ephemeral;

    if (interaction.replied || interaction.deferred) {
        return interaction.followUp(payload);
    }
    return interaction.reply(payload);
}

module.exports = {
    getMemberVoiceChannel,
    hasVoicePermissions,
    replyEphemeral,
};
