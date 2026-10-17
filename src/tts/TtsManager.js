'use strict';

const EdgeTtsProvider = require('./providers/EdgeTtsProvider');
const LoquendoProvider = require('./providers/LoquendoProvider');
const { getVoiceById, VOICES } = require('./voiceRegistry');
const { cleanDiscordText } = require('./text-sanitizer');
const config = require('../config');

class TtsManager {
    /**
     * @param {{ edgeProvider?: any, loquendoProvider?: any }} [options]
     */
    constructor({ edgeProvider, loquendoProvider } = {}) {
        this.edgeProvider = edgeProvider || new EdgeTtsProvider();
        this.loquendoProvider =
            loquendoProvider ||
            new LoquendoProvider({
                apiUrl: config.tts.loquendoApiUrl,
            });
    }

    /**
     * Limpia y formatea el texto antes de enviarlo a síntesis.
     * @param {string} rawText
     * @returns {string}
     */
    cleanText(rawText) {
        return cleanDiscordText(rawText, config.bot.maxTtsLength);
    }

    /**
     * Obtiene el stream de audio para un texto y voz dados.
     * @param {string} text
     * @param {string | null} [voiceId]
     * @param {object} [options]
     * @returns {Promise<{ stream: import('node:stream').Readable, voice: object, format: string, text: string }>}
     */
    async generateAudio(text, voiceId = null, options = {}) {
        const cleanedText = this.cleanText(text);
        if (!cleanedText) {
            throw new Error('El mensaje no contiene texto válido para reproducir.');
        }

        const selectedVoiceId = voiceId || config.bot.defaultVoice;
        const voiceInfo = getVoiceById(selectedVoiceId) || {
            id: selectedVoiceId,
            name: selectedVoiceId,
            provider: selectedVoiceId.startsWith('loquendo') ? 'loquendo' : 'edge',
        };

        let result;
        if (voiceInfo.provider === 'loquendo') {
            result = await this.loquendoProvider.synthesize(cleanedText, {
                voice: voiceInfo.id,
                ...options,
            });
        } else {
            result = await this.edgeProvider.synthesize(cleanedText, {
                voice: voiceInfo.id,
                ...options,
            });
        }

        return {
            stream: result.stream,
            format: result.format,
            voice: voiceInfo,
            text: cleanedText,
        };
    }

    /**
     * Devuelve la lista completa de voces disponibles.
     */
    getVoices() {
        return VOICES;
    }
}

const defaultTtsManager = new TtsManager();

module.exports = Object.assign(defaultTtsManager, { TtsManager });

