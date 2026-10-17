'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { JsonStore } = require('../src/core/store');
const { SoundManager } = require('../src/sound/sound-manager');

async function makeTempDir() {
    return await fsp.mkdtemp(path.join(os.tmpdir(), 'ignite-sound-manager-'));
}

test('SoundManager initializes with 12 default sounds', async () => {
    const tmp = await makeTempDir();
    try {
        const store = new JsonStore(tmp);
        const manager = new SoundManager({ store, dataDir: tmp });
        await manager.init();

        const list = manager.list();
        assert.equal(list.length, 12);
        assert.equal(list[0].id, 'snd-1');
        assert.equal(list[0].name, 'Airhorn MLG');
    } finally {
        await fsp.rm(tmp, { recursive: true, force: true });
    }
});

test('SoundManager CRUD operations modify store atomically', async () => {
    const tmp = await makeTempDir();
    try {
        const store = new JsonStore(tmp);
        const manager = new SoundManager({ store, dataDir: tmp });
        await manager.init();

        // 1. Add sound
        const created = manager.add({
            name: 'Test Sound',
            emoji: '🔔',
            category: 'reactions',
            duration: 3,
            uploadedBy: '123456789012345678',
        });
        assert.equal(created.name, 'Test Sound');
        assert.equal(created.emoji, '🔔');
        assert.equal(manager.get(created.id)?.name, 'Test Sound');

        // 2. Increment plays
        const played = manager.incrementPlays(created.id);
        assert.equal(played.playsCount, 1);
        assert.notEqual(played.lastPlayedAt, null);

        // 3. Update sound
        const updated = manager.update(created.id, {
            name: 'Updated Sound',
            category: 'gaming',
        });
        assert.equal(updated.name, 'Updated Sound');
        assert.equal(updated.category, 'gaming');

        // 4. Set file
        const withFile = manager.setFile(created.id, 'sample.mp3', 5);
        assert.equal(withFile.file, 'sample.mp3');
        assert.equal(withFile.duration, 5);

        // 5. Remove sound
        const removed = manager.remove(created.id);
        assert.equal(removed, true);
        assert.equal(manager.get(created.id), null);

        await manager.drain();
    } finally {
        await fsp.rm(tmp, { recursive: true, force: true });
    }
});
