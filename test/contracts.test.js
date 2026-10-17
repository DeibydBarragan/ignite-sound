'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    ApiError,
    problem,
    sendProblem,
    sendError,
    serializeSound,
    serializeVoice,
} = require('../src/api/contracts');

function fakeRes() {
    return {
        statusCode: null,
        body: null,
        contentType: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        type(ct) {
            this.contentType = ct;
            return this;
        },
        json(val) {
            this.body = val;
            return this;
        },
    };
}

test('serializeSound preserves contract structure and hasFile boolean', () => {
    const raw = {
        id: 'snd-100',
        name: 'Victory',
        emoji: '🏆',
        category: 'gaming',
        duration: 4,
        preset: 'victory',
        playsCount: 15,
        lastPlayedAt: 123456789,
        file: 'snd-100.mp3',
        uploadedBy: '123456789012345678',
    };
    const sound = serializeSound(raw);

    assert.equal(sound.id, 'snd-100');
    assert.equal(sound.name, 'Victory');
    assert.equal(sound.emoji, '🏆');
    assert.equal(sound.hasFile, true);

    const noFile = serializeSound({ id: 'snd-101', name: 'Draft', file: null });
    assert.equal(noFile.hasFile, false);
});

test('serializeVoice formats voice catalog entries correctly', () => {
    const voice = serializeVoice({
        id: 'es-MX-DaliaNeural',
        name: 'Dalia',
        gender: 'Femenino',
        lang: 'es-MX',
        flag: '🇲🇽',
        provider: 'edge',
        description: 'Voz suave',
    });
    assert.equal(voice.id, 'es-MX-DaliaNeural');
    assert.equal(voice.flag, '🇲🇽');
    assert.equal(voice.provider, 'edge');
});

test('problem() creates RFC 7807 document with legacy error key', () => {
    const doc = problem(404, 'SOUND_NOT_FOUND', 'Sonido no encontrado.');

    assert.equal(doc.status, 404);
    assert.equal(doc.code, 'SOUND_NOT_FOUND');
    assert.equal(doc.detail, 'Sonido no encontrado.');
    assert.equal(doc.error, 'Sonido no encontrado.');
    assert.equal(typeof doc.timestamp, 'string');
    assert.match(doc.type, /https:\/\/ignite\.bot\/errors\/sound-not-found/);
});

test('sendProblem sends application/problem+json response', () => {
    const res = fakeRes();
    sendProblem(res, 400, 'INVALID_BODY', 'Invalid parameter');

    assert.equal(res.statusCode, 400);
    assert.equal(res.contentType, 'application/problem+json');
    assert.equal(res.body.code, 'INVALID_BODY');
    assert.equal(res.body.error, 'Invalid parameter');
});

test('sendError handles ApiError instances with custom status and code', () => {
    const res = fakeRes();
    const err = new ApiError(404, 'CUSTOM_NOT_FOUND', 'Custom message', { extra: { foo: 'bar' } });
    sendError(res, err);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.code, 'CUSTOM_NOT_FOUND');
    assert.equal(res.body.foo, 'bar');
});
