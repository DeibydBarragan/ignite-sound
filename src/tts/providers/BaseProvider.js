'use strict';

/**
 * Clase base para todos los proveedores de Text-to-Speech (TTS).
 */
class BaseProvider {
    constructor(name) {
        this.name = name;
    }

    /**
     * Sintetiza texto y retorna un ReadableStream de audio o un Buffer.
     * @param {string} text Texto a sintetizar
     * @param {object} options Opciones de voz (voice, rate, pitch, volume)
     * @returns {Promise<{ stream: import('node:stream').Readable, format: string }>}
     */
    async synthesize(text, options = {}) {
        throw new Error(`synthesize() no implementado en el proveedor ${this.name}`);
    }

    /**
     * Sanitiza el texto de entrada para evitar inyecciones XML/SSML o carácteres no válidos.
     * @param {string} text
     * @returns {string}
     */
    sanitizeText(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;')
            .trim();
    }
}

module.exports = BaseProvider;
