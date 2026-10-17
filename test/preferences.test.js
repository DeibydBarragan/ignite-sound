'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const config = require('../src/config');
const { JsonStore } = require('../src/core/store');
const { VoicePreferences } = require('../src/tts/voicePreferences');

async function makeTempDir() {
    return await fsp.mkdtemp(path.join(os.tmpdir(), 'ignite-sound-prefs-'));
}

test('VoicePreferences returns default voice when no preference exists', async () => {
    const tmp = await makeTempDir();
    try {
        const store = new JsonStore(tmp);
        const prefs = new VoicePreferences({ store });
        await prefs.init();

        assert.equal(prefs.getUserVoice('999999999999999999'), config.bot.defaultVoice);
    } finally {
        await fsp.rm(tmp, { recursive: true, force: true });
    }
});

test('VoicePreferences saves and retrieves user voice preferences atomically', async () => {
    const tmp = await makeTempDir();
    try {
        const store = new JsonStore(tmp);
        const prefs = new VoicePreferences({ store });
        await prefs.init();

        const userId = '123456789012345678';
        prefs.setUserVoice(userId, 'es-ES-AlvaroNeural');

        // Instant in-memory cache check
        assert.equal(prefs.getUserVoice(userId), 'es-ES-AlvaroNeural');

        await prefs.drain();

        // Verify JSON file on disk
        const raw = await fsp.readFile(path.join(tmp, 'voice-preferences.json'), 'utf8');
        const parsed = JSON.parse(raw);
        assert.equal(parsed.users[userId], 'es-ES-AlvaroNeural');
    } finally {
        await fsp.rm(tmp, { recursive: true, force: true });
    }
});
