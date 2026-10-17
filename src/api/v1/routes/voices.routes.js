'use strict';

const express = require('express');
const { listVoices } = require('../ops/voices.ops');

function createVoicesRouter() {
    const router = express.Router();
    router.get('/voices', (req, res) => {
        res.json(listVoices());
    });
    return router;
}

module.exports = { createVoicesRouter };
