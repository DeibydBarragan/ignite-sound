'use strict';

const ttsManager = require('../../../tts/TtsManager');
const { serializeVoice } = require('../../contracts');

function listVoices() {
    const raw = ttsManager.getVoices() || [];
    const voices = raw.map(serializeVoice);
    return {
        total: voices.length,
        voices,
    };
}

module.exports = { listVoices };
