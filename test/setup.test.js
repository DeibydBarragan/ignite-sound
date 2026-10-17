'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { SetupError } = require('../src/setup/setup-error');
const { nodeVersionOk, missingPackages } = require('../src/setup/bootstrap');
const { checkToken, canWrite, ensureEnvFile } = require('../src/setup/preflight-checks');

test('SetupError contains problem count and formatted message', () => {
    const err = new SetupError(3);
    assert.equal(err.name, 'SetupError');
    assert.equal(err.problems, 3);
    assert.match(err.message, /3 problem\(s\)/);
});

test('nodeVersionOk validates semantic version against threshold', () => {
    assert.equal(nodeVersionOk('22.18.0'), true);
    assert.equal(nodeVersionOk('20.0.0'), true);
    assert.equal(nodeVersionOk('18.12.0'), false);
    assert.equal(nodeVersionOk('16.0.0'), false);
});

test('missingPackages returns no missing modules when dependencies are installed', () => {
    const missing = missingPackages(path.join(__dirname, '..'));
    assert.deepEqual(missing, []);
});

test('checkToken handles valid Discord responses and errors accurately', async () => {
    // Valid token
    const mockSuccess = async () => ({
        ok: true,
        status: 200,
        json: async () => ({ id: '123456789012345678', name: 'IgniteSoundBot' }),
    });
    const resSuccess = await checkToken('mock-token', /** @type {any} */ (mockSuccess));
    assert.equal(resSuccess.ok, true);
    assert.equal(resSuccess.application.id, '123456789012345678');

    // Invalid token (401)
    const mock401 = async () => ({
        ok: false,
        status: 401,
    });
    const res401 = await checkToken('bad-token', /** @type {any} */ (mock401));
    assert.equal(res401.ok, false);
    assert.equal(res401.reason, 'invalid');

    // Network failure
    const mockFail = async () => {
        throw new Error('Network timeout');
    };
    const resFail = await checkToken('fail-token', /** @type {any} */ (mockFail));
    assert.equal(resFail.ok, false);
    assert.equal(resFail.reason, 'unreachable');
    assert.match(resFail.detail, /Network timeout/);
});

test('canWrite tests filesystem write capability in tmp directory', () => {
    const tmpDir = path.join(os.tmpdir(), `ignite-sound-test-${Date.now()}`);
    assert.equal(canWrite(tmpDir), true);
});

test('ensureEnvFile returns false when .env already exists or DISCORD_TOKEN is set', () => {
    const exists = ensureEnvFile(path.join(__dirname, '..'));
    assert.equal(exists, false);
});
