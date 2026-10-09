'use strict';

const EdgeTtsProvider = require('./providers/EdgeTtsProvider');
const LoquendoProvider = require('./providers/LoquendoProvider');
const { getVoiceById, VOICES } = require('./voiceRegistry');
const config = require('../config');

class TtsManager {
    constructor() {
        this.edgeProvider = new EdgeTtsProvider();
        this.loquendoProvider = new LoquendoProvider({
            apiUrl: config.tts.loquendoApiUrl,
        });
    }

    /**
     * Limpia y formatea el texto antes de enviarlo a síntesis.
     * Convierte menciones de Discord y limita la longitud.
     * @param {string} rawText
     * @returns {string}
     */
    cleanText(rawText) {
        if (!rawText) return '';
        let text = rawText
            // Reemplazar menciones de usuarios <@123456789> por 'usuario'
            .replace(/<@!?\d+>/g, 'un usuario')
            // Reemplazar canales <#123456789> por 'canal'
            .replace(/<#\d+>/g, 'un canal')
            // Reemplazar roles <@&123456789> por 'rol'
            .replace(/<@&\d+>/g, 'un rol')
            // Reemplazar emojis personalizados <:name:123456789> por su nombre
            .replace(/<a?:([a-zA-Z0-9_]+):\d+>/g, '$1')
            // Reemplazar URLs largas por 'enlace'
            .replace(/https?:\/\/\S+/gi, 'un enlace')
            .trim();

        // Truncar si excede la longitud máxima configurada
        if (text.length > config.bot.maxTtsLength) {
            text = text.substring(0, config.bot.maxTtsLength).trim() + '...';
        }

        return text;
    }

    /**
     * Obtiene el stream de audio para un texto y voz dados.
     * @param {string} text
     * @param {string} [voiceId]
     * @param {object} [options]
     * @returns {Promise<{ stream: import('node:stream').Readable, voice: object, format: string }>}
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

module.exports = new TtsManager();
