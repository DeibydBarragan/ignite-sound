'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { snowflake, soundId, schemas, validateBody } = require('../src/api/middleware/validate');

function fakeRes() {
    return {
        statusCode: null,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        type() {
            return this;
        },
        json(val) {
            this.body = val;
            return this;
        },
    };
}

test('snowflake schema accepts 17-20 digit strings and rejects invalid inputs', () => {
    assert.equal(snowflake.safeParse('123456789012345678').success, true);
    assert.equal(snowflake.safeParse('12345678901234567890').success, true);
    assert.equal(snowflake.safeParse('12345').success, false);
    assert.equal(snowflake.safeParse('abc123456789012345').success, false);
});

test('soundId schema validates alphanumeric and hyphen identifiers', () => {
    assert.equal(soundId.safeParse('snd-1').success, true);
    assert.equal(soundId.safeParse('victory_sound-99').success, true);
    assert.equal(soundId.safeParse('').success, false);
    assert.equal(soundId.safeParse('../bad/path').success, false);
});

test('validateBody rejects missing text in ttsPreview and returns RFC 7807', () => {
    const middleware = validateBody(schemas.body.ttsPreview);
    const req = { body: {} };
    const res = fakeRes();
    let nextCalled = false;

    middleware(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, 'INVALID_BODY');
    assert.match(res.body.detail, /text/);
});

test('validateBody parses valid ttsSpeak payload into req.validated', () => {
    const middleware = validateBody(schemas.body.ttsSpeak);
    const req = {
        body: {
            text: 'Hello Discord',
            guildId: '123456789012345678',
            rate: '+10%',
        },
    };
    const res = fakeRes();
    let nextCalled = false;

    middleware(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.validated.body.text, 'Hello Discord');
});
