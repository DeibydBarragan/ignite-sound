'use strict';

const express = require('express');
const { createStatusRouter } = require('./routes/status.routes');
const { createVoicesRouter } = require('./routes/voices.routes');
const { createTtsRouter } = require('./routes/tts.routes');
const { createSoundsRouter } = require('./routes/sounds.routes');

function createRouter(client) {
    const router = express.Router();

    router.use(createStatusRouter(client));
    router.use(createVoicesRouter());
    router.use(createTtsRouter(client));
    router.use(createSoundsRouter(client));

    return router;
}

module.exports = { createRouter };
