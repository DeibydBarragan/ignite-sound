'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PermissionsBitField } = require('discord.js');
const { loadCommands } = require('../src/commands');
const {
    getMemberVoiceChannel,
    hasVoicePermissions,
    replyEphemeral,
} = require('../src/commands/_shared');
const { commandBodies } = require('../src/deploy');

test('loadCommands discovers and instantiates all slash command modules', () => {
    const commands = loadCommands();
    assert.ok(commands.size >= 7);
    assert.ok(commands.has('leave'));
    assert.ok(commands.has('sound'));
    assert.ok(commands.has('sound-add'));
    assert.ok(commands.has('stop'));
    assert.ok(commands.has('tts'));
    assert.ok(commands.has('setvoice'));
    assert.ok(commands.has('voices'));

    for (const [name, cmd] of commands.entries()) {
        assert.equal(typeof cmd.data.name, 'string');
        assert.equal(cmd.data.name, name);
        assert.equal(typeof cmd.execute, 'function');
    }
});

test('commandBodies produces valid array of command schemas for Discord REST', () => {
    const bodies = commandBodies();
    assert.ok(Array.isArray(bodies));
    assert.ok(bodies.length >= 7);
    const names = bodies.map((b) => b.name);
    assert.ok(names.includes('tts'));
    assert.ok(names.includes('sound'));
});

test('getMemberVoiceChannel extracts voice channel or returns null', () => {
    const fakeChannel = { id: 'channel-123', name: 'General' };
    const interactionWithVoice = /** @type {any} */ ({
        member: { voice: { channel: fakeChannel } },
    });
    assert.equal(getMemberVoiceChannel(interactionWithVoice), fakeChannel);

    const interactionWithoutVoice = /** @type {any} */ ({
        member: { voice: {} },
    });
    assert.equal(getMemberVoiceChannel(interactionWithoutVoice), null);
});

test('hasVoicePermissions checks Connect and Speak permissions accurately', () => {
    const fakeClientUser = /** @type {any} */ ({ id: 'bot-123' });

    // Permitted channel
    const allowedPerms = new PermissionsBitField([
        PermissionsBitField.Flags.Connect,
        PermissionsBitField.Flags.Speak,
    ]);
    const channelWithPerms = /** @type {any} */ ({
        permissionsFor: () => allowedPerms,
    });
    assert.equal(hasVoicePermissions(channelWithPerms, fakeClientUser), true);

    // Missing speak
    const missingSpeakPerms = new PermissionsBitField([PermissionsBitField.Flags.Connect]);
    const channelMissingSpeak = /** @type {any} */ ({
        permissionsFor: () => missingSpeakPerms,
    });
    assert.equal(hasVoicePermissions(channelMissingSpeak, fakeClientUser), false);

    // Null checks
    assert.equal(hasVoicePermissions(null, fakeClientUser), false);
    assert.equal(hasVoicePermissions(channelWithPerms, null), false);
});

test('replyEphemeral sends payload with MessageFlags.Ephemeral', async () => {
    let calledWith = null;
    const fakeInteraction = /** @type {any} */ ({
        replied: false,
        deferred: false,
        reply: async (payload) => {
            calledWith = payload;
        },
    });

    await replyEphemeral(fakeInteraction, 'Test error message');
    assert.equal(calledWith.content, 'Test error message');
    assert.equal(Boolean(calledWith.flags & 64), true); // MessageFlags.Ephemeral = 64
});
