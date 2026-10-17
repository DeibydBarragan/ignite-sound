'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApiApp } = require('../src/api/server');

const mockClient = {
    guilds: {
        cache: new Map([['123456789012345678', { id: '123456789012345678', name: 'Test Guild' }]]),
    },
};

test('GET /api/v1/health returns ok status and uptime', async () => {
    const app = createApiApp(mockClient);
    const server = await new Promise((resolve) => {
        const s = app.listen(0, () => resolve(s));
    });
    try {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;

        const res = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.status, 'ok');
        assert.equal(typeof data.uptime, 'number');

        // Verify legacy /api/health alias works identically
        const legacyRes = await fetch(`http://127.0.0.1:${port}/api/health`);
        assert.equal(legacyRes.status, 200);
    } finally {
        server.close();
    }
});

test('GET /api/v1/status returns service snapshot', async () => {
    const app = createApiApp(mockClient);
    const server = await new Promise((resolve) => {
        const s = app.listen(0, () => resolve(s));
    });
    try {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;

        const res = await fetch(`http://127.0.0.1:${port}/api/v1/status`);
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.status, 'online');
        assert.equal(data.service, 'ignite-sound');
        assert.equal(typeof data.uptime, 'number');
    } finally {
        server.close();
    }
});

test('GET /api/v1/voices returns voice catalog', async () => {
    const app = createApiApp(mockClient);
    const server = await new Promise((resolve) => {
        const s = app.listen(0, () => resolve(s));
    });
    try {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;

        const res = await fetch(`http://127.0.0.1:${port}/api/v1/voices`);
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(typeof data.total, 'number');
        assert.equal(Array.isArray(data.voices), true);
        assert.ok(data.voices.length > 0);
    } finally {
        server.close();
    }
});

test('GET /api/v1/sounds returns soundboard list', async () => {
    const app = createApiApp(mockClient);
    const server = await new Promise((resolve) => {
        const s = app.listen(0, () => resolve(s));
    });
    try {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;

        const res = await fetch(`http://127.0.0.1:${port}/api/v1/sounds`);
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(typeof data.total, 'number');
        assert.equal(Array.isArray(data.sounds), true);
    } finally {
        server.close();
    }
});
