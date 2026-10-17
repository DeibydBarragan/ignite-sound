'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('../config');

const MIN_API_SECRET_LENGTH = 32;
const SNOWFLAKE = /^\d{17,20}$/;
const TOKEN = /^[\w-]{20,}\.[\w-]{4,}\.[\w-]{20,}$/;

const TOKEN_STEPS = [
    '1. Open https://discord.com/developers/applications and select your bot',
    '2. Go to "Bot" and press "Reset Token", then copy the token',
    '3. Paste it into the .env file:  DISCORD_TOKEN=your_token',
];

/**
 * Create .env from .env.example on first start if .env does not exist.
 */
function ensureEnvFile(root = config.root) {
    const envFile = path.join(root, '.env');
    const example = path.join(root, '.env.example');
    if (fs.existsSync(envFile) || process.env.DISCORD_TOKEN) return false;
    if (!fs.existsSync(example)) return false;
    fs.copyFileSync(example, envFile);
    return true;
}

/**
 * Ask Discord who this token belongs to. Returns { ok, application } or { ok: false, reason }.
 * @param {string} token
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{ ok: boolean, application?: any, reason?: string, detail?: string }>}
 */
async function checkToken(token, fetchImpl = fetch) {
    try {
        const response = await fetchImpl('https://discord.com/api/v10/applications/@me', {
            headers: { Authorization: `Bot ${token}` },
            signal: AbortSignal.timeout(10_000),
        });
        if (response.status === 401) return { ok: false, reason: 'invalid' };
        if (!response.ok) return { ok: false, reason: 'unreachable', detail: `HTTP ${response.status}` };
        return { ok: true, application: await response.json() };
    } catch (error) {
        return { ok: false, reason: 'unreachable', detail: error.message };
    }
}

/**
 * Verify write permissions on a directory.
 * @param {string} dir
 */
function canWrite(dir) {
    try {
        fs.mkdirSync(dir, { recursive: true });
        const probe = path.join(dir, `.write-test-${crypto.randomBytes(4).toString('hex')}`);
        fs.writeFileSync(probe, 'ok');
        fs.rmSync(probe);
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if a module can be required.
 * @param {string} name
 */
function loads(name) {
    try {
        require(name);
        return true;
    } catch {
        return false;
    }
}

module.exports = {
    MIN_API_SECRET_LENGTH,
    SNOWFLAKE,
    TOKEN,
    TOKEN_STEPS,
    ensureEnvFile,
    checkToken,
    canWrite,
    loads,
};
