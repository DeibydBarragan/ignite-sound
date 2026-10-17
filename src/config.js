'use strict';

const path = require('node:path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

try {
    const ffmpegStatic = require('ffmpeg-static');
    if (ffmpegStatic && !process.env.FFMPEG_PATH) {
        process.env.FFMPEG_PATH = String(ffmpegStatic);
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

const list = (key) => env(key).split(',').map((item) => item.trim()).filter(Boolean);

const parseColor = (value) => {
    const hex = String(value).replace('#', '');
    const parsed = Number.parseInt(hex, 16);
    return /^[0-9a-f]{6}$/i.test(hex) && Number.isFinite(parsed) ? parsed : 0xff4500;
};

const config = {
    root: path.join(__dirname, '..'),
    dataDir: path.resolve(path.join(__dirname, '..'), env('DATA_DIR', 'data')),
    debug: bool('DEBUG', false),
    noColor: Boolean(env('NO_COLOR')),

    discord: {
        token: env('DISCORD_TOKEN'),
        get clientId() {
            return env('CLIENT_ID');
        },
        guildId: env('GUILD_ID') || null,
    },

    bot: {
        status: env('BOT_STATUS', '/tts | Ignite Sound'),
        color: parseColor(env('EMBED_COLOR', '#FF4500')),
        prefix: env('PREFIX', '!'),
        leaveOnEmpty: int('LEAVE_ON_EMPTY', 60, { min: 0 }),
        leaveOnEmptyMs: int('LEAVE_ON_EMPTY', 60, { min: 0 }) * 1000,
        maxTtsLength: int('MAX_TTS_LENGTH', 300, { min: 20, max: 2000 }),
        defaultVoice: env('DEFAULT_VOICE', 'es-MX-DaliaNeural'),
    },

    tts: {
        loquendoApiUrl: env('LOQUENDO_API_URL', ''),
    },

    api: {
        enabled: bool('API_ENABLED', true),
        port: int('PORT', 3002, { min: 1024, max: 65535 }),
        // Accepts API_SECRET or fallback to legacy API_KEY
        secret: env('API_SECRET') || env('API_KEY'),
        get key() {
            return config.api.secret;
        },
        allowedOrigins: list('API_ALLOWED_ORIGINS'),
        rateLimitPerMinute: int('API_RATE_LIMIT_PER_MINUTE', 120, { min: 1, max: 100000 }),
    },
};

/**
 * Recursively freeze configuration so runtime code cannot mutate it.
 */
const deepFreeze = (value) => {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
        if ('value' in descriptor) deepFreeze(descriptor.value);
    }
    return value;
};

module.exports = deepFreeze(config);
