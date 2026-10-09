'use strict';

const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const BaseProvider = require('./BaseProvider');

function formatPitch(val) {
    if (!val) return '+0Hz';
    if (typeof val === 'string' && (val.endsWith('%') || val.endsWith('Hz'))) {
        return val.startsWith('+') || val.startsWith('-') ? val : `+${val}`;
    }
    const num = Number(val);
    if (!Number.isFinite(num)) return '+0Hz';
    // Si viene como multiplicador decimal (ej: 0.5 a 2.5)
    if (num >= 0.4 && num <= 2.5) {
        const percent = Math.round((num - 1) * 100);
        return percent >= 0 ? `+${percent}%` : `${percent}%`;
    }
    return num >= 0 ? `+${num}Hz` : `${num}Hz`;
}

function formatRate(val) {
    if (!val) return '+0%';
    if (typeof val === 'string' && val.endsWith('%')) {
        return val.startsWith('+') || val.startsWith('-') ? val : `+${val}`;
    }
    const num = Number(val);
    if (!Number.isFinite(num)) return '+0%';
    // Si viene como multiplicador decimal (ej: 0.5 a 2.5)
    if (num >= 0.4 && num <= 2.5) {
        const percent = Math.round((num - 1) * 100);
        return percent >= 0 ? `+${percent}%` : `${percent}%`;
    }
    return num >= 0 ? `+${num}%` : `${num}%`;
}

class EdgeTtsProvider extends BaseProvider {
    constructor() {
        super('edge');
    }

    /**
     * Sintetiza texto usando las voces neuronales de Microsoft Edge TTS.
     * @param {string} text Texto a sintetizar
     * @param {object} options Opciones de voz
     * @param {string} [options.voice='es-MX-DaliaNeural'] Voz neuronal
     * @param {string|number} [options.rate=0] Velocidad
     * @param {string|number} [options.pitch='+0Hz'] Tono
     * @param {string} [options.volume='+0%'] Volumen
     * @returns {Promise<{ stream: import('node:stream').Readable, format: string }>}
     */
    async synthesize(text, options = {}) {
        const voice = options.voice || 'es-MX-DaliaNeural';
        const sanitized = this.sanitizeText(text);

        if (!sanitized) {
            throw new Error('El texto para sintetizar no puede estar vacío.');
        }

        const client = new MsEdgeTTS();

        // Se pasa un objeto vacío {} como 3er argumento para evitar el bug interno de msedge-tts con undefined.voiceLocale
        await client.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {});

        const ttsOptions = {
            rate: formatRate(options.rate),
            pitch: formatPitch(options.pitch),
            volume: options.volume || '+0%',
        };

        const { audioStream } = client.toStream(sanitized, ttsOptions);

        return {
            stream: audioStream,
            format: 'mp3',
        };
    }
}

module.exports = EdgeTtsProvider;
