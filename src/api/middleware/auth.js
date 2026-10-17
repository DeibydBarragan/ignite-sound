'use strict';

const crypto = require('node:crypto');
const config = require('../../config');
const logger = require('../../core/logger');
const { sendProblem } = require('../contracts');

const log = logger.createLogger('api-auth');

const MIN_SECRET_LENGTH = 32;
const SNOWFLAKE = /^\d{17,20}$/;
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Extract token from "Authorization: Bearer <token>" header.
 */
function extractBearer(header) {
    if (typeof header !== 'string') return null;
    const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
    return match ? match[1] : null;
}

/**
 * Constant-time comparison between two strings over buffers.
 */
function safeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const left = Buffer.from(a, 'utf8');
    const right = Buffer.from(b, 'utf8');
    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
}

/**
 * Bearer authentication middleware with fail-closed security in production.
 */
function requireAuth(req, res, next) {
    const secret = config.api.secret || '';

    // If no secret is configured:
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            log.error('API_SECRET is missing in production; rejecting request.');
            return sendProblem(res, 503, 'AUTH_NOT_CONFIGURED', 'API authentication is not configured.');
        }
        // In local development without secret, allow unauthenticated requests
        return next();
    }

    if (secret.length < MIN_SECRET_LENGTH && process.env.NODE_ENV === 'production') {
        log.error('API_SECRET is too short (< 32 chars) in production.');
        return sendProblem(res, 503, 'AUTH_NOT_CONFIGURED', 'API authentication is not configured.');
    }

    const token = extractBearer(req.headers.authorization);
    if (!token || !safeEqual(token, secret)) {
        return sendProblem(res, 401, 'UNAUTHORIZED', 'Invalid or missing bearer token.');
    }
    return next();
}

/**
 * Validates Discord user identifier on state-changing requests.
 */
function requireUser(req, res, next) {
    if (!MUTATION_METHODS.has(req.method)) return next();

    // Check X-User-Discord-Id header or body fallback
    const raw = req.headers['x-user-discord-id'] || req.body?.userId || req.body?.uploadedBy;
    const value = typeof raw === 'string' ? raw.trim() : '';

    if (value && SNOWFLAKE.test(value)) {
        req.discordUserId = value;
        return next();
    }

    if (process.env.NODE_ENV === 'production') {
        return sendProblem(
            res,
            400,
            'INVALID_USER',
            'Missing or invalid X-User-Discord-Id header (Discord snowflake required).'
        );
    }

    return next();
}

module.exports = {
    requireAuth,
    requireUser,
    extractBearer,
    safeEqual,
    MIN_SECRET_LENGTH,
    SNOWFLAKE,
};
