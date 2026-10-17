'use strict';

function getStatus(client) {
    return {
        status: 'online',
        service: 'ignite-sound',
        uptime: Math.floor(process.uptime()),
        guilds: client?.guilds ? client.guilds.cache.size : 0,
        timestamp: new Date().toISOString(),
    };
}

module.exports = { getStatus };
