'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { JsonStore } = require('../src/core/store');

async function makeTempDir() {
    return await fsp.mkdtemp(path.join(os.tmpdir(), 'ignite-sound-store-'));
}

test('JsonStore initialization loads existing JSON files into memory', async () => {
    const tmp = await makeTempDir();
    try {
        const filePath = path.join(tmp, 'test-key.json');
        await fsp.writeFile(filePath, JSON.stringify({ hello: 'world' }), 'utf8');

        const store = new JsonStore(tmp);
        assert.equal(store.get('test-key'), null);

        await store.initialize();
        assert.deepEqual(store.get('test-key'), { hello: 'world' });
    } finally {
        await fsp.rm(tmp, { recursive: true, force: true });
    }
});

test('JsonStore set writes atomically and updates in-memory cache', async () => {
    const tmp = await makeTempDir();
    try {
        const store = new JsonStore(tmp);
        await store.set('prefs', { volume: 80 });

        assert.deepEqual(store.get('prefs'), { volume: 80 });

        const raw = await fsp.readFile(path.join(tmp, 'prefs.json'), 'utf8');
        assert.deepEqual(JSON.parse(raw), { volume: 80 });
    } finally {
        await fsp.rm(tmp, { recursive: true, force: true });
    }
});

test('JsonStore serializes concurrent writes without corruption', async () => {
    const tmp = await makeTempDir();
    try {
        const store = new JsonStore(tmp);
        const writes = [];
        for (let i = 0; i < 20; i++) {
            writes.push(store.set('counter', { value: i }));
        }
        await Promise.all(writes);

        assert.equal(typeof store.get('counter').value, 'number');
        const raw = await fsp.readFile(path.join(tmp, 'counter.json'), 'utf8');
        assert.doesNotThrow(() => JSON.parse(raw));
    } finally {
        await fsp.rm(tmp, { recursive: true, force: true });
    }
});

test('JsonStore delete removes key from cache and deletes file on disk', async () => {
    const tmp = await makeTempDir();
    try {
        const store = new JsonStore(tmp);
        await store.set('temp', { data: 123 });
        assert.notEqual(store.get('temp'), null);

        await store.delete('temp');
        assert.equal(store.get('temp'), null);

        const files = await fsp.readdir(tmp);
        assert.equal(files.includes('temp.json'), false);
    } finally {
        await fsp.rm(tmp, { recursive: true, force: true });
    }
});

test('JsonStore rejects invalid keys with traversal or illegal characters', () => {
    const store = new JsonStore('/tmp');
    assert.throws(() => store.get('../bad'), /Invalid store key/);
    assert.throws(() => store.get('has space'), /Invalid store key/);
    assert.throws(() => store.get('special$char'), /Invalid store key/);
});
