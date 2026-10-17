'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { withVoiceLock } = require('../src/voice/voice-lock');
const { VoiceManager } = require('../src/voice/voice-manager');
const { GuildVoiceSession } = require('../src/voice/voice-session');

test('withVoiceLock executes tasks sequentially per guildId', async () => {
    const order = [];
    const p1 = withVoiceLock('guild-1', async () => {
        await new Promise((r) => setTimeout(r, 20));
        order.push(1);
    });
    const p2 = withVoiceLock('guild-1', async () => {
        order.push(2);
    });
    await Promise.all([p1, p2]);

    assert.deepEqual(order, [1, 2]);
});

test('VoiceManager maintains one session per guild and cleans up on leave', () => {
    const vm = new VoiceManager();
    const s1 = vm.getSession('guild-100');
    const s2 = vm.getSession('guild-100');
    assert.equal(s1, s2);

    const s3 = vm.getSession('guild-200');
    assert.notEqual(s1, s3);

    vm.leave('guild-100');
    const s1New = vm.getSession('guild-100');
    assert.notEqual(s1, s1New);
});

test('GuildVoiceSession enqueues items and empties queue on stop', () => {
    const session = new GuildVoiceSession('guild-test');
    // Prevent unmocked external TTS network calls during pure queue unit test
    session.processNext = async () => {};
    assert.equal(session.queue.length, 0);

    session.enqueue({ text: 'Hello', voiceId: 'es-MX-DaliaNeural' });
    assert.equal(session.isPlaying, true);

    session.enqueue({ text: 'World', voiceId: 'es-MX-DaliaNeural' });
    assert.equal(session.queue.length, 2);

    session.stop();
    assert.equal(session.queue.length, 0);
    assert.equal(session.isPlaying, false);

    session.destroy();
});

test('GuildVoiceSession isAlone checks for human non-bot members', () => {
    const session = new GuildVoiceSession('guild-test');

    // No channel reference
    assert.equal(session.isAlone(), false);

    // Channel with only bots
    session.updateChannel({
        id: 'chan-1',
        members: new Map([
            ['bot-1', { user: { bot: true } }],
            ['bot-2', { user: { bot: true } }],
        ]),
    });
    assert.equal(session.isAlone(), true);

    // Channel with human
    session.updateChannel({
        id: 'chan-1',
        members: new Map([
            ['bot-1', { user: { bot: true } }],
            ['user-1', { user: { bot: false } }],
        ]),
    });
    assert.equal(session.isAlone(), false);

    session.destroy();
});
