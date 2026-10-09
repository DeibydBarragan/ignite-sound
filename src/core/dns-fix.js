'use strict';

const dns = require('node:dns');

// En Windows, getaddrinfo con { all: true } (usado por undici/fetch en discord.js)
// puede fallar con EAI_FAIL (-3004) al consultar IPv6 (AAAA) en redes sin rutas IPv6.
// Forzamos family: 4 para resolver IPv4 de manera confiable e inmediata.
if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
}

const origLookup = dns.lookup;
dns.lookup = function (host, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = { family: 4 };
    } else if (typeof options === 'number') {
        options = { family: options || 4 };
    } else if (typeof options === 'object' && options !== null) {
        options = { ...options, family: 4 };
    } else {
        options = { family: 4 };
    }
    return origLookup.call(this, host, options, callback);
};
