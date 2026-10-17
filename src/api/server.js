'use strict';

/**
 * Internal REST API. Configures the HTTP shell (security middleware,
 * rate limiting, health) and mounts the v1 router; routes live in
 * src/api/v1/routes/*.routes.js and execute domain operations through ops.
 */

const crypto = require('node:crypto');
const express = require('express');
const cors = require('cors');
const helmet = /** @type {any} */ (require('helmet'));
const { rateLimit } = require('express-rate-limit');
const config = require('../config');
const { createRouter } = require('./v1/router');
const { sendError } = require('./contracts');
const logger = require('../core/logger');

const log = logger.createLogger('api');

function createApiApp(client) {
    const app = express();
    app.disable('x-powered-by');
    app.use(helmet());

    // CORS: allow origins listed in API_ALLOWED_ORIGINS, or allow if empty in dev
    const allowedOrigins = config.api.allowedOrigins;
    app.use(
        cors({
            origin(origin, callback) {
                if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
                    return callback(null, true);
                }
                if (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'production') {
                    return callback(null, true);
                }
                return callback(null, false);
            },
        })
    );

    app.use(express.json({ limit: '100kb' }));

    // Request ID for structured log correlation
    app.use((req, res, next) => {
        req.id = crypto.randomUUID().slice(0, 8);
        next();
    });

    app.use(
        rateLimit({
            windowMs: 60_000,
            limit: config.api.rateLimitPerMinute,
            standardHeaders: true,
            legacyHeaders: false,
        })
    );

    // ─── Health / Ping (public liveness) ────────────────────────
    const health = (req, res) => {
        res.json({ status: 'ok', uptime: Math.floor(process.uptime()) });
    };
    app.get('/api/health', health);
    app.get('/api/v1/health', health);

    const router = createRouter(client);
    app.use('/api/v1', router);
    app.use('/api', router);

    // RFC 7807 global error handler
    app.use((error, req, res, next) => {
        if (res.headersSent) return next(error);
        log.error(`API error (${req.method} ${req.originalUrl}) [req ${req.id}]: ${error.message}`);
        return sendError(res, error);
    });

    return app;
}

function startApiServer(client) {
    if (!config.api.enabled) {
        log.info('API server is disabled in config.');
        return null;
    }

    const app = createApiApp(client);
    const server = app.listen(config.api.port, '0.0.0.0', () => {
        log.ok(`REST API server listening on http://0.0.0.0:${config.api.port}`);
    });
    return server;
}

module.exports = {
    createApiApp,
    createApiServer: createApiApp,
    startApiServer,
};
