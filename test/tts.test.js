'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { cleanDiscordText, escapeXml, sanitizeForTts } = require('../src/tts/text-sanitizer');
const { getVoiceById } = require('../src/tts/voiceRegistry');
const { TtsManager } = require('../src/tts/TtsManager');

test('cleanDiscordText transforms mentions, emojis, and urls to speech-friendly text', () => {
    const raw = 'Hola <@123456789>, únete a <#987654321> con rol <@&1122334455> <:fire:55555> https://example.com/test';
    const cleaned = cleanDiscordText(raw, 500);

    assert.equal(cleaned, 'Hola un usuario, únete a un canal con rol un rol fire un enlace');
});

test('cleanDiscordText truncates text exceeding maximum length', () => {
    const longText = 'a'.repeat(50);
    const capped = cleanDiscordText(longText, 20);

    assert.equal(capped.endsWith('...'), true);
    assert.equal(capped.length <= 23, true);
});

test('escapeXml escapes dangerous characters for SSML safety', () => {
    const raw = '<speak>Hello & "Goodbye" \'friend\'</speak>';
    const escaped = escapeXml(raw);

    assert.equal(escaped, '&lt;speak&gt;Hello &amp; &quot;Goodbye&quot; &apos;friend&apos;&lt;/speak&gt;');
});

test('sanitizeForTts runs cleanDiscordText and escapeXml pipeline', () => {
    const raw = 'Mira <@123> & escucha';
    const result = sanitizeForTts(raw);

    assert.equal(result, 'Mira un usuario &amp; escucha');
});


test('getVoiceById resolves curated voices by id or partial name', () => {
    const byId = getVoiceById('es-MX-DaliaNeural');
    assert.notEqual(byId, null);
    assert.equal(byId.name, 'Dalia (México)');

    const byName = getVoiceById('loquendo');
    assert.notEqual(byName, null);
    assert.equal(byName.provider, 'loquendo');

    assert.equal(getVoiceById('unknown-voice-id'), null);
});

test('TtsManager delegates synthesis to mock provider with sanitized text', async () => {
    let capturedText = null;
    let capturedOptions = null;

    const mockEdge = {
        synthesize: async (text, options) => {
            capturedText = text;
            capturedOptions = options;
            return { stream: Readable.from(['audio']), format: 'mp3' };
        },
    };

    const manager = new TtsManager({ edgeProvider: mockEdge });
    const result = await manager.generateAudio('Hola <@123>', 'es-MX-DaliaNeural', { rate: '+10%' });

    assert.equal(capturedText, 'Hola un usuario');
    assert.equal(capturedOptions.rate, '+10%');
    assert.equal(result.format, 'mp3');
    assert.equal(result.text, 'Hola un usuario');
});
