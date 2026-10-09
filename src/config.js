'use strict';

const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

try {
    const ffmpegPath = require('ffmpeg-static');
    if (ffmpegPath && !process.env.FFMPEG_PATH) {
        process.env.FFMPEG_PATH = ffmpegPath;
    }
} catch {}

const env = (key, fallback = '') => {
    const value = process.env[key];
    return value === undefined || value.trim() === '' ? fallback : value.trim();
};

const int = (key, fallback, { min = -Infinity, max = Infinity } = {}) => {
    const parsed = Number.parseInt(env(key), 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
};

const bool = (key, fallback = false) => {
    const value = env(key).toLowerCase();
    if (!value) return fallback;
    return ['1', 'true', 'yes', 'on'].includes(value);
};

const parseColor = (value) => {
    const hex = String(value).replace('#', '');
    const parsed = Number.parseInt(hex, 16);
    return /^[0-9a-f]{6}$/i.test(hex) && Number.isFinite(parsed) ? parsed : 0xff4500;
};

module.exports = {
    root: path.join(__dirname, '..'),
    debug: bool('DEBUG', false),

    discord: {
        token: env('DISCORD_TOKEN'),
        clientId: env('CLIENT_ID'),
        guildId: env('GUILD_ID') || null,
    },

    bot: {
        status: env('BOT_STATUS', '/tts | Ignite Sound'),
        color: parseColor(env('EMBED_COLOR', '#FF4500')),
        prefix: env('PREFIX', '!'),
        leaveOnEmpty: int('LEAVE_ON_EMPTY', 60, { min: 0 }),
        maxTtsLength: int('MAX_TTS_LENGTH', 300, { min: 20, max: 2000 }),
        defaultVoice: env('DEFAULT_VOICE', 'es-MX-DaliaNeural'),
    },

    tts: {
        loquendoApiUrl: env('LOQUENDO_API_URL', ''),
    },

    api: {
        port: int('PORT', 3002, { min: 1024, max: 65535 }),
        key: env('API_KEY', ''),
    },
};
