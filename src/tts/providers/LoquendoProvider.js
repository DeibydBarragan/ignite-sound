'use strict';

const { Readable } = require('node:stream');
const BaseProvider = require('./BaseProvider');
const EdgeTtsProvider = require('./EdgeTtsProvider');
const logger = require('../../core/logger');

const log = logger.createLogger('tts:loquendo');

class LoquendoProvider extends BaseProvider {
    /**
     * @param {object} [options]
     * @param {string} [options.apiUrl] URL del servidor o endpoint de Loquendo
     */
    constructor(options = {}) {
        super('loquendo');
        this.apiUrl = options.apiUrl || '';
        this.fallbackProvider = new EdgeTtsProvider();
    }

    /**
     * Sintetiza la voz clásica de Loquendo.
     * Si hay una API URL configurada, solicita el audio a dicha URL con timeout de 10s.
     * De lo contrario, utiliza emulación neuronal con modulación de Jorge / Carlos.
     * @param {string} text Texto a sintetizar
     * @param {{ voice?: string, rate?: string | number, pitch?: string | number, volume?: string }} [options] Opciones de voz
     * @returns {Promise<{ stream: import('node:stream').Readable, format: string }>}
     */
    async synthesize(text, options = {}) {
        const sanitized = this.sanitizeText(text);
        if (!sanitized) {
            throw new Error('El texto para sintetizar no puede estar vacío.');
        }

        const opts = options || {};

        // 1. Si el usuario configuró una API propia o proxy de Loquendo
        if (this.apiUrl) {
            try {
                const response = await fetch(this.apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: sanitized,
                        voice: opts.voice || 'Jorge',
                        lang: 'es',
                    }),
                    signal: AbortSignal.timeout(10_000),
                });

                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    const stream = Readable.from(Buffer.from(arrayBuffer));
                    return { stream, format: 'mp3' };
                }
            } catch (err) {
                log.warn(`Error conectando a API externa (${this.apiUrl}), usando motor interno:`, err.message);
            }
        }

        // 2. Emulación de la voz clásica de Loquendo
        const voiceStr = String(opts.voice || '');
        const isCarlos = voiceStr.includes('carlos');
        const targetVoice = isCarlos ? 'es-MX-JorgeNeural' : 'es-ES-AlvaroNeural';

        return await this.fallbackProvider.synthesize(sanitized, {
            voice: targetVoice,
            rate: opts.rate || '-3%',
            pitch: opts.pitch || '-4Hz',
            volume: opts.volume || '+10%',
        });
    }
}

module.exports = LoquendoProvider;
