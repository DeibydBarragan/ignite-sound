'use strict';

const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const BaseProvider = require('./BaseProvider');
const { escapeXml } = require('../text-sanitizer');

function formatPitch(val) {
    if (!val) return '+0Hz';
    if (typeof val === 'string' && (val.endsWith('%') || val.endsWith('Hz'))) {
        return val.startsWith('+') || val.startsWith('-') ? val : `+${val}`;
    }
    const num = Number(val);
    if (!Number.isFinite(num)) return '+0Hz';
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
     * @param {{ voice?: string, rate?: string | number, pitch?: string | number, volume?: string }} [options] Opciones de voz
     * @returns {Promise<{ stream: import('node:stream').Readable, format: string }>}
     */
    async synthesize(text, options = {}) {
        const opts = options || {};
        const voice = opts.voice || 'es-MX-DaliaNeural';
        const sanitized = escapeXml(text.trim());

        if (!sanitized) {
            throw new Error('El texto para sintetizar no puede estar vacío.');
        }

        const client = new MsEdgeTTS();

        // Objeto vacío {} en 3er argumento para evitar bug de undefined.voiceLocale en msedge-tts
        await client.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {});

        const ttsOptions = {
            rate: formatRate(opts.rate),
            pitch: formatPitch(opts.pitch),
            volume: opts.volume || '+0%',
        };

        const { audioStream } = client.toStream(sanitized, ttsOptions);

        return {
            stream: audioStream,
            format: 'mp3',
        };
    }
}

module.exports = EdgeTtsProvider;
