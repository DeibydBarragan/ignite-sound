'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const logger = require('../src/core/logger');

test('logger creates scoped child instances with standard methods', () => {
    const log = logger.createLogger('test-scope');
    assert.equal(typeof log.info, 'function');
    assert.equal(typeof log.debug, 'function');
    assert.equal(typeof log.warn, 'function');
    assert.equal(typeof log.error, 'function');
    assert.equal(typeof log.ok, 'function');
    assert.equal(typeof log.child, 'function');

    const sub = log.child('sub');
    assert.equal(typeof sub.info, 'function');
});
