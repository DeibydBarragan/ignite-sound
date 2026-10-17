'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { extractBearer, safeEqual, requireAuth, requireUser } = require('../src/api/middleware/auth');

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

test('extractBearer extracts token accurately', () => {
    assert.equal(extractBearer('Bearer my-secret-token'), 'my-secret-token');
    assert.equal(extractBearer('bearer my-secret-token'), 'my-secret-token');
    assert.equal(extractBearer('Basic user:pass'), null);
    assert.equal(extractBearer(undefined), null);
    assert.equal(extractBearer(''), null);
});

test('safeEqual performs constant-time string comparison without throwing', () => {
    assert.equal(safeEqual('abc', 'abc'), true);
    assert.equal(safeEqual('abc', 'xyz'), false);
    assert.equal(safeEqual('short', 'longer-string'), false);
    // @ts-ignore
    assert.equal(safeEqual(null, 'abc'), false);
});

test('requireUser permits GET without snowflake header', () => {
    const req = { method: 'GET', headers: {} };
    const res = fakeRes();
    let called = false;

    requireUser(req, res, () => {
        called = true;
    });

    assert.equal(called, true);
    assert.equal(res.statusCode, null);
});

test('requireUser captures snowflake from header on mutations', () => {
    const req = {
        method: 'POST',
        headers: { 'x-user-discord-id': '123456789012345678' },
        body: {},
    };
    const res = fakeRes();
    let called = false;

    requireUser(req, res, () => {
        called = true;
    });

    assert.equal(called, true);
    assert.equal(req.discordUserId, '123456789012345678');
});

test('requireAuth permits requests when no secret is configured in development', () => {
    const req = { headers: {} };
    const res = fakeRes();
    let called = false;

    requireAuth(req, res, () => {
        called = true;
    });

    assert.equal(called, true);
});

