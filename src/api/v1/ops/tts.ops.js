'use strict';

const ttsManager = require('../../../tts/TtsManager');
const voiceManager = require('../../../voice/voiceManager');
const config = require('../../../config');
const { resolveVoiceTarget } = require('./voice-target');

async function previewTts({ text, voice, rate, pitch }) {
    return await ttsManager.generateAudio(text, voice, { rate, pitch });
}

async function speakTts({ client, guildId, channelId, text, voice, rate, pitch }) {
    const { guild, voiceChannel } = resolveVoiceTarget(client, guildId, channelId);

    const session = voiceManager.getSession(guild.id);
    session.connect(voiceChannel);

    session.enqueue({
        text,
        voiceId: voice,
        options: { rate, pitch },
    });

    return {
        success: true,
        message: 'TTS emitido en Discord con éxito.',
        channel: { id: voiceChannel.id, name: voiceChannel.name },
        voice: voice || config.bot.defaultVoice,
        text,
    };
}

module.exports = { previewTts, speakTts };
