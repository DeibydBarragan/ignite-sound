'use strict';

const fsp = require('node:fs/promises');
const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');
const { JsonStore } = require('../core/store');
const log = require('../core/logger').createLogger('sound');

/**
 * Initial 12 sound catalog mirroring frontend mock data.
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

const VALID_CATEGORIES = new Set(['memes', 'gaming', 'reactions', 'sfx', 'anime']);

class SoundManager {
    /**
     * @param {{ store?: any, dataDir?: string }} [options]
     */
    constructor({ store, dataDir } = {}) {
        this.dataDir = dataDir || config.dataDir;
        this.audioDirInternal = path.join(this.dataDir, 'sounds');
        this.store = store || new JsonStore(this.dataDir);
        this.sounds = [...DEFAULT_SOUNDS];
        this.ready = null;

        // Auto-initialize directories
        fsp.mkdir(this.audioDirInternal, { recursive: true }).catch((err) => {
            log.warn('Could not create audio directory:', err.message);
        });

        this.init();
    }

    /**
     * Idempotent async initialization from JsonStore.
     */
    init() {
        this.ready ??= (async () => {
            await this.store.initialize();
            const persisted = this.store.get('sounds');
            if (Array.isArray(persisted) && persisted.length > 0) {
                this.sounds = persisted;
            } else {
                this.sounds = [...DEFAULT_SOUNDS];
                await this.store.set('sounds', this.sounds);
            }
            return this;
        })();
        return this.ready;
    }

    get audioDir() {
        return this.audioDirInternal;
    }

    list() {
        return this.sounds.map((s) => ({ ...s, hasFile: Boolean(s.file) }));
    }

    get(id) {
        if (!id) return null;
        return this.sounds.find((s) => s.id === id) || null;
    }

    resolveFile(soundOrId) {
        const sound = typeof soundOrId === 'string' ? this.get(soundOrId) : soundOrId;
        if (!sound || !sound.file) return null;
        const abs = path.isAbsolute(sound.file) ? sound.file : path.join(this.audioDirInternal, sound.file);
        try {
            if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
        } catch {}
        return null;
    }

    persist() {
        return this.store.set('sounds', this.sounds).catch((err) => {
            log.warn('Failed to persist sound catalog:', err.message);
        });
    }

    drain() {
        return this.store.drain();
    }

    incrementPlays(id) {
        const sound = this.get(id);
        if (!sound) return null;
        sound.playsCount = (sound.playsCount || 0) + 1;
        sound.lastPlayedAt = Date.now();
        this.persist();
        return { ...sound };
    }

    add({ name, emoji = '🎵', category = 'memes', duration = 2, preset = 'tada', file = null, uploadedBy = null }) {
        const cleanName = String(name || '').trim();
        if (!cleanName) throw new Error('El nombre del sonido es obligatorio.');

        const sound = {
            id: 'snd-' + Date.now(),
            name: cleanName,
            emoji: String(emoji || '🎵').trim() || '🎵',
            category: VALID_CATEGORIES.has(category) ? category : 'memes',
            duration: Number(duration) || 2,
            preset,
            playsCount: 0,
            lastPlayedAt: null,
            file: file || null,
            uploadedBy: uploadedBy ? String(uploadedBy) : null,
        };
        this.sounds.unshift(sound);
        this.persist();
        return { ...sound };
    }

    setFile(id, file, duration = null) {
        const sound = this.get(id);
        if (!sound) return null;

        if (sound.file && sound.file !== file) {
            const prev = path.isAbsolute(sound.file) ? sound.file : path.join(this.audioDirInternal, sound.file);
            fsp.unlink(prev).catch(() => {});
        }

        sound.file = file;
        if (duration !== null && duration !== undefined && Number.isFinite(Number(duration))) {
            sound.duration = Math.max(1, Math.min(30, Math.round(Number(duration))));
        }
        this.persist();
        return { ...sound, hasFile: true };
    }

    /**
     * @param {string} id
     * @param {{ name?: string, emoji?: string, category?: string, uploadedBy?: string | null }} [fields]
     */
    update(id, { name, emoji, category, uploadedBy } = {}) {
        const sound = this.get(id);
        if (!sound) return null;

        if (name !== undefined) {
            const clean = String(name).trim().slice(0, 60);
            if (!clean) throw new Error('El nombre del sonido es obligatorio.');
            sound.name = clean;
        }
        if (emoji !== undefined) {
            sound.emoji = String(emoji).trim() || '🎵';
        }
        if (category !== undefined && VALID_CATEGORIES.has(category)) {
            sound.category = category;
        }
        if (uploadedBy !== undefined) {
            sound.uploadedBy = uploadedBy ? String(uploadedBy) : null;
        }
        this.persist();
        return { ...sound, hasFile: Boolean(sound.file) };
    }

    remove(id) {
        const idx = this.sounds.findIndex((s) => s.id === id);
        if (idx === -1) return false;

        const [deleted] = this.sounds.splice(idx, 1);
        if (deleted && deleted.file) {
            const abs = path.isAbsolute(deleted.file) ? deleted.file : path.join(this.audioDirInternal, deleted.file);
            fsp.unlink(abs).catch(() => {});
        }
        this.persist();
        return true;
    }
}

const defaultManager = new SoundManager();

module.exports = Object.assign(defaultManager, {
    SoundManager,
    DEFAULT_SOUNDS,
});


