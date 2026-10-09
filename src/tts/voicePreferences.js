'use strict';

const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');

const DATA_DIR = path.join(config.root, 'data');
const PREFS_FILE = path.join(DATA_DIR, 'voice-preferences.json');

let cache = { users: {} };

function loadPreferences() {
    try {
        if (fs.existsSync(PREFS_FILE)) {
            const raw = fs.readFileSync(PREFS_FILE, 'utf8');
            cache = JSON.parse(raw);
        }
    } catch (err) {
        console.error('[VoicePreferences] Error cargando preferencias:', err.message);
    }
}

function savePreferences() {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(PREFS_FILE, JSON.stringify(cache, null, 2), 'utf8');
    } catch (err) {
        console.error('[VoicePreferences] Error guardando preferencias:', err.message);
    }
}

loadPreferences();

/**
 * Obtiene la voz predeterminada guardada para un usuario.
 * @param {string} userId
 * @returns {string} ID de la voz
 */
function getUserVoice(userId) {
    if (!cache.users) cache.users = {};
    return cache.users[userId] || config.bot.defaultVoice;
}

/**
 * Guarda la voz predeterminada de un usuario de forma persistente.
 * @param {string} userId
 * @param {string} voiceId
 */
function setUserVoice(userId, voiceId) {
    if (!cache.users) cache.users = {};
    cache.users[userId] = voiceId;
    savePreferences();
}

module.exports = {
    getUserVoice,
    setUserVoice,
};
