'use strict';

/**
 * Single source of truth for ignite-sound REST API contracts:
 * - Serializers for Soundboard and Voices.
 * - RFC 7807 problem details generator with application/problem+json.
 * - Backward-compatible `error` extension for Next.js BFF (lib/http.ts).
 */

const ERROR_BASE = 'https://ignite.bot/errors';

const ERROR_TITLES = {
    400: 'Invalid Request Parameter',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    413: 'Payload Too Large',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
};

class ApiError extends Error {
    /**
     * @param {number} status HTTP status code
     * @param {string} code Machine-readable error code
     * @param {string} detail Human-readable explanation
     * @param {{ title?: string, type?: string, extra?: Record<string, any> }} [options]
     */
    constructor(status, code, detail, { title, type, extra } = {}) {
        super(detail);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.title = title || ERROR_TITLES[status] || 'Error';
        this.type = type || `${ERROR_BASE}/${String(code).toLowerCase().replace(/_/g, '-')}`;
        this.extra = extra || {};
    }
}

/**
 * Builds an RFC 7807 problem details object.
 */
function problem(status, code, detail, options = {}) {
    const { title, type, ...fields } = options;
    return {
        type: type || `${ERROR_BASE}/${String(code).toLowerCase().replace(/_/g, '-')}`,
        title: title || ERROR_TITLES[status] || 'Error',
        status,
        detail,
        code,
        timestamp: new Date().toISOString(),
        // Legacy extension key: ignite-frontend BFF expects this
        error: detail,
        ...fields,
    };
}

function sendProblem(res, status, code, detail, options = {}) {
    return res
        .status(status)
        .type('application/problem+json')
        .json(problem(status, code, detail, options));
}

function sendError(res, error) {
    if (error instanceof ApiError) {
        return sendProblem(res, error.status, error.code, error.message, {
            title: error.title,
            type: error.type,
            ...error.extra,
        });
    }
    return sendProblem(res, 500, 'INTERNAL_ERROR', error?.message || 'Internal server error');
}

function sendOpResult(res, result) {
    if (result && result.ok) {
        return res.status(result.status || 200).json(result.data);
    }
    const code = result?.code || 'op_failed';
    const status = Number(result?.status) || 500;
    return sendProblem(res, status, code, result?.message || 'Operation failed', result?.extra || {});
}

function serializeSound(sound) {
    if (!sound) return null;
    return {
        id: sound.id,
        name: sound.name,
        emoji: sound.emoji || '🎵',
        category: sound.category || 'memes',
        duration: sound.duration || 2,
        preset: sound.preset || 'tada',
        playsCount: sound.playsCount || 0,
        lastPlayedAt: sound.lastPlayedAt || null,
        file: sound.file || null,
        uploadedBy: sound.uploadedBy || null,
        hasFile: Boolean(sound.file),
    };
}

function serializeVoice(voice) {
    if (!voice) return null;
    return {
        id: voice.id,
        name: voice.name,
        gender: voice.gender,
        lang: voice.lang,
        flag: voice.flag,
        provider: voice.provider,
        description: voice.description || '',
    };
}

module.exports = {
    ERROR_TITLES,
    ApiError,
    problem,
    sendProblem,
    sendError,
    sendOpResult,
    serializeSound,
    serializeVoice,
};
