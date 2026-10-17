'use strict';

const express = require('express');
const { getStatus } = require('../ops/status.ops');

function createStatusRouter(client) {
    const router = express.Router();
    router.get('/status', (req, res) => {
        res.json(getStatus(client));
    });
    return router;
}

module.exports = { createStatusRouter };
