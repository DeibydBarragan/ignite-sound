'use strict';

const config = require('../config');
const { JsonStore } = require('../core/store');
const log = require('../core/logger').createLogger('preferences');

class VoicePreferences {
    /**
     * @param {{ store?: any }} [options]
     */
    constructor({ store } = {}) {
        this.store = store || new JsonStore(config.dataDir);
        this.ready = null;
        this.init();
    }

    /**
     * Idempotent initialization loading from JsonStore into memory.
     */
    init() {
        this.ready ??= (async () => {
            await this.store.initialize();
            const prefs = this.store.get('voice-preferences');
            if (!prefs || typeof prefs !== 'object' || !prefs.users) {
                await this.store.set('voice-preferences', { users: {} });
            }
            return this;
        })();
        return this.ready;
    }

    /**
     * Gets default voice for user from in-memory cache.
     * @param {string} userId
     * @returns {string} Voice ID
     */
    getUserVoice(userId) {
        const prefs = this.store.get('voice-preferences');
        return prefs?.users?.[userId] || config.bot.defaultVoice;
    }

    /**
     * Persists default voice for user asynchronously and atomically.
     * @param {string} userId
     * @param {string} voiceId
     */
    setUserVoice(userId, voiceId) {
        const prefs = this.store.get('voice-preferences') || { users: {} };
        if (!prefs.users) prefs.users = {};
        prefs.users[userId] = voiceId;
        return this.store.set('voice-preferences', prefs).catch((err) => {
            log.warn('Could not persist voice preference:', err.message);
        });
    }

    drain() {
        return this.store.drain();
    }
}

const defaultPreferences = new VoicePreferences();

module.exports = {
    getUserVoice: (userId) => defaultPreferences.getUserVoice(userId),
    setUserVoice: (userId, voiceId) => defaultPreferences.setUserVoice(userId, voiceId),
    VoicePreferences,
    defaultPreferences,
};
