'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../src/config');

test('config is recursively frozen', () => {
    assert.equal(Object.isFrozen(config), true);
    assert.equal(Object.isFrozen(config.discord), true);
    assert.equal(Object.isFrozen(config.bot), true);
    assert.equal(Object.isFrozen(config.api), true);

    // Attempting to mutate should fail or be ignored in strict mode
    assert.throws(() => {
        // @ts-ignore
        config.debug = true;
    }, TypeError);
});

test('config has required structure and defaults', () => {
    assert.equal(typeof config.root, 'string');
    assert.equal(typeof config.api.port, 'number');
    assert.equal(typeof config.bot.color, 'number');
    assert.equal(typeof config.bot.leaveOnEmpty, 'number');
    assert.equal(typeof config.bot.leaveOnEmptyMs, 'number');
    assert.equal(config.bot.leaveOnEmptyMs, config.bot.leaveOnEmpty * 1000);
});
