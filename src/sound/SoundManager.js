'use strict';

const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');

/**
 * Catálogo inicial: refleja los 12 sonidos del frontend
 * (ignite-frontend/lib/mock-data.ts MOCK_SOUNDS).
 * `file: null` = aún sin binario; el frontend usa preview local (Web Audio)
 * hasta que se suba el .mp3 correspondiente vía upload (paso 3).
 */
const DEFAULT_SOUNDS = [
    { id: 'snd-1', name: 'Airhorn MLG', emoji: '📢', category: 'memes', duration: 2, preset: 'airhorn', playsCount: 142, file: null },
    { id: 'snd-2', name: 'Sad Violin', emoji: '🎻', category: 'memes', duration: 4, preset: 'violin', playsCount: 98, file: null },
    { id: 'snd-3', name: 'Ta-Da Fanfare', emoji: '🎺', category: 'sfx', duration: 2, preset: 'tada', playsCount: 65, file: null },
    { id: 'snd-4', name: 'Ba-Dum Tss', emoji: '🥁', category: 'memes', duration: 2, preset: 'badumtss', playsCount: 84, file: null },
    { id: 'snd-5', name: 'Bruh Sound', emoji: '🤖', category: 'memes', duration: 1, preset: 'bruh', playsCount: 210, file: null },
    { id: 'snd-6', name: 'Quack Pato', emoji: '🦆', category: 'memes', duration: 1, preset: 'quack', playsCount: 77, file: null },
    { id: 'snd-7', name: 'Alarma Nuclear', emoji: '🚨', category: 'sfx', duration: 3, preset: 'alarm', playsCount: 52, file: null },
    { id: 'snd-8', name: 'Level Up Retro', emoji: '⭐', category: 'gaming', duration: 2, preset: 'levelup', playsCount: 130, file: null },
    { id: 'snd-9', name: 'Victory Royale', emoji: '🏆', category: 'gaming', duration: 4, preset: 'victory', playsCount: 164, file: null },
    { id: 'snd-10', name: 'Aplausos Masivos', emoji: '👏', category: 'reactions', duration: 3, preset: 'applause', playsCount: 43, file: null },
    { id: 'snd-11', name: 'Anime Wow', emoji: '✨', category: 'anime', duration: 2, preset: 'tada', playsCount: 119, file: null },
    { id: 'snd-12', name: 'Game Over', emoji: '💀', category: 'gaming', duration: 3, preset: 'violin', playsCount: 88, file: null },
];

const DATA_DIR = path.join(config.root, 'data');
const JSON_PATH = path.join(DATA_DIR, 'sounds.json');
const AUDIO_DIR = path.join(DATA_DIR, 'sounds');

function ensureDirs() {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.mkdirSync(AUDIO_DIR, { recursive: true });
    } catch {}
}

class SoundManager {
    constructor() {
        ensureDirs();
        this.sounds = this.load();
    }

    load() {
        try {
            if (fs.existsSync(JSON_PATH)) {
                const raw = fs.readFileSync(JSON_PATH, 'utf8');
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (err) {
            console.warn('[SoundManager] No se pudo leer sounds.json, usando catálogo por defecto:', err.message);
        }
        this.persist(DEFAULT_SOUNDS);
        return [...DEFAULT_SOUNDS];
    }

    persist(sounds = this.sounds) {
        try {
            ensureDirs();
            fs.writeFileSync(JSON_PATH, JSON.stringify(sounds, null, 2), 'utf8');
        } catch (err) {
            console.warn('[SoundManager] No se pudo guardar sounds.json:', err.message);
        }
    }

    /** Lista completa del catálogo (copia para evitar mutaciones externas). */
    list() {
        return this.sounds.map((s) => ({ ...s, hasFile: Boolean(s.file) }));
    }

    get(id) {
        if (!id) return null;
        return this.sounds.find((s) => s.id === id) || null;
    }

    /**
     * Resuelve la ruta absoluta del binario de un sonido.
     * @returns {string|null} ruta absoluta si existe el archivo, null si aún no tiene binario.
     */
    resolveFile(soundOrId) {
        const sound = typeof soundOrId === 'string' ? this.get(soundOrId) : soundOrId;
        if (!sound || !sound.file) return null;
        const abs = path.isAbsolute(sound.file) ? sound.file : path.join(AUDIO_DIR, sound.file);
        try {
            if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
        } catch {}
        return null;
    }

    incrementPlays(id) {
        const sound = this.get(id);
        if (!sound) return null;
        sound.playsCount = (sound.playsCount || 0) + 1;
        this.persist();
        return { ...sound };
    }

    /**
     * Registra un sonido con binario ya guardado en AUDIO_DIR.
     * (El endpoint de upload del paso 3 usará este método.)
     */
    add({ name, emoji = '🎵', category = 'memes', duration = 2, preset = 'tada', file = null, uploadedBy = null }) {
        const cleanName = String(name || '').trim();
        if (!cleanName) throw new Error('El nombre del sonido es obligatorio.');
        const sound = {
            id: 'snd-' + Date.now(),
            name: cleanName,
            emoji,
            category,
            duration: Number(duration) || 2,
            preset,
            playsCount: 0,
            file: file || null,
            // Discord user id de quien lo subió (null = sonido de serie). Lo usa
            // el frontend para la sección "Propios". Sin restricción de escucha:
            // cualquiera puede reproducir cualquier sonido.
            uploadedBy: uploadedBy ? String(uploadedBy) : null,
        };
        this.sounds.unshift(sound);
        this.persist();
        return { ...sound };
    }

    /** Directorio donde viven los binarios (para configurar multer en server.js). */
    get audioDir() {
        ensureDirs();
        return AUDIO_DIR;
    }

    /**
     * Asocia o reemplaza el binario de un sonido existente.
     * @param {string} id
     * @param {string} file nombre del archivo dentro de AUDIO_DIR
     * @param {number} [duration] duración aprox. en segundos (1-30)
     */
    setFile(id, file, duration = null) {
        const sound = this.get(id);
        if (!sound) return null;
        // Borra el binario anterior si es distinto (mejor esfuerzo)
        try {
            if (sound.file && sound.file !== file) {
                const prev = path.isAbsolute(sound.file) ? sound.file : path.join(AUDIO_DIR, sound.file);
                if (fs.existsSync(prev)) fs.unlinkSync(prev);
            }
        } catch {}
        sound.file = file;
        if (duration !== null && duration !== undefined && Number.isFinite(Number(duration))) {
            sound.duration = Math.max(1, Math.min(30, Math.round(Number(duration))));
        }
        this.persist();
        return { ...sound, hasFile: true };
    }

    /**
     * Actualiza nombre / emoji / categoría de un sonido existente.
     * @returns {object|null} copia del sonido actualizado, o null si no existe.
     */
    update(id, { name, emoji, category } = {}) {
        const sound = this.get(id);
        if (!sound) return null;
        const CATEGORIES = new Set(['memes', 'gaming', 'reactions', 'sfx', 'anime']);
        if (name !== undefined) {
            const clean = String(name).trim().slice(0, 60);
            if (!clean) throw new Error('El nombre del sonido es obligatorio.');
            sound.name = clean;
        }
        if (emoji !== undefined) {
            sound.emoji = String(emoji).trim() || '🎵';
        }
        if (category !== undefined && CATEGORIES.has(category)) {
            sound.category = category;
        }
        this.persist();
        return { ...sound, hasFile: Boolean(sound.file) };
    }

    remove(id) {
        const idx = this.sounds.findIndex((s) => s.id === id);
        if (idx === -1) return false;
        const [deleted] = this.sounds.splice(idx, 1);
        // Borra el binario asociado si existe (mejor esfuerzo)
        try {
            if (deleted.file) {
                const abs = path.isAbsolute(deleted.file) ? deleted.file : path.join(AUDIO_DIR, deleted.file);
                if (fs.existsSync(abs)) fs.unlinkSync(abs);
            }
        } catch {}
        this.persist();
        return true;
    }
}

module.exports = new SoundManager();
