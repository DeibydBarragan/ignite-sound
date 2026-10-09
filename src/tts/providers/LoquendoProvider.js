'use strict';

const { Readable } = require('node:stream');
const BaseProvider = require('./BaseProvider');
const EdgeTtsProvider = require('./EdgeTtsProvider');

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
     * Si hay una API URL configurada, solicita el audio a dicha URL.
     * De lo contrario, utiliza la voz española clásica con modulación característica de Jorge.
     * @param {string} text Texto a sintetizar
     * @param {object} options Opciones de voz
     * @returns {Promise<{ stream: import('node:stream').Readable, format: string }>}
     */
    async synthesize(text, options = {}) {
        const sanitized = this.sanitizeText(text);
        if (!sanitized) {
            throw new Error('El texto para sintetizar no puede estar vacío.');
        }

        // 1. Si el usuario configuró una API propia o proxy de Loquendo
        if (this.apiUrl) {
            try {
                const response = await fetch(this.apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: sanitized,
                        voice: options.voice || 'Jorge',
                        lang: 'es',
                    }),
                });

                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    const stream = Readable.from(Buffer.from(arrayBuffer));
                    return { stream, format: 'mp3' };
                }
            } catch (err) {
                console.warn(`[LoquendoProvider] Error conectando a API externa (${this.apiUrl}), usando motor interno:`, err.message);
            }
        }

        // 2. Emulación de la voz clásica de Loquendo:
        // Si es Carlos, se usa la voz latina masculina. Para Jorge, la clásica voz castellana.
        const isCarlos = options.voice && options.voice.includes('carlos');
        const targetVoice = isCarlos ? 'es-MX-JorgeNeural' : 'es-ES-AlvaroNeural';

        return await this.fallbackProvider.synthesize(sanitized, {
            voice: targetVoice,
            rate: options.rate || '-3%',
            pitch: options.pitch || '-4Hz',
            volume: options.volume || '+10%',
        });
    }
}

module.exports = LoquendoProvider;
