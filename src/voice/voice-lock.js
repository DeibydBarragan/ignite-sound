'use strict';

const locks = new Map();

/**
 * Serializes concurrent asynchronous operations on a guild's voice session.
 * Prevents race conditions when multiple enqueue, play, or stop operations arrive simultaneously.
 *
 * @template T
 * @param {string} guildId
 * @param {() => Promise<T>} task
 * @returns {Promise<T>}
 */
function withVoiceLock(guildId, task) {
    const previous = locks.get(guildId) || Promise.resolve();
    const next = previous.catch(() => undefined).then(task);
    locks.set(guildId, next);

    const cleanup = () => {
        if (locks.get(guildId) === next) locks.delete(guildId);
    };
    next.then(cleanup, cleanup);
    return next;
}

module.exports = { withVoiceLock };
