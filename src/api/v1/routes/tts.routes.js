'use strict';

const express = require('express');
const { validateBody, schemas } = require('../../middleware/validate');
const { requireAuth, requireUser } = require('../../middleware/auth');
const { previewTts, speakTts } = require('../ops/tts.ops');

function createTtsRouter(client) {
    const router = express.Router();

    router.post(
        '/tts/preview',
        requireAuth,
        validateBody(schemas.body.ttsPreview),
        async (req, res, next) => {
            try {
                const { text, voice, rate, pitch } = req.body;
                const { stream, format } = await previewTts({ text, voice, rate, pitch });
                res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'audio/webm');
                stream.on('error', (err) => {
                    if (!res.headersSent) next(err);
                });
                stream.pipe(res);
            } catch (err) {
                next(err);
            }
        }
    );

    router.post(
        '/tts/speak',
        requireAuth,
        requireUser,
        validateBody(schemas.body.ttsSpeak),
        async (req, res, next) => {
            try {
                const { guildId, channelId, text, voice, rate, pitch } = req.body;
                const result = await speakTts({ client, guildId, channelId, text, voice, rate, pitch });
                res.json(result);
            } catch (err) {
                next(err);
            }
        }
    );

    return router;
}

module.exports = { createTtsRouter };
