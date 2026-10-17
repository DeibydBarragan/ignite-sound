'use strict';

const express = require('express');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const multer = require('multer');
const soundManager = require('../../../sound/sound-manager');
const { validateParams, validateBody, schemas } = require('../../middleware/validate');
const { requireAuth, requireUser } = require('../../middleware/auth');
const { sendProblem } = require('../../contracts');
const {
    listSounds,
    getSoundPreview,
    playSound,
    uploadSound,
    attachSoundFile,
    updateSound,
    removeSound,
} = require('../ops/sounds.ops');

const MAX_SOUND_BYTES = 5 * 1024 * 1024; // 5 MB
const AUDIO_EXTS = new Set(['.mp3', '.ogg', '.oga', '.wav', '.webm', '.m4a']);

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, soundManager.audioDir),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname || '').toLowerCase();
            const safeExt = AUDIO_EXTS.has(ext) ? ext : '.mp3';
            cb(null, `snd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`);
        },
    }),
    limits: { fileSize: MAX_SOUND_BYTES, files: 1 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        if (!AUDIO_EXTS.has(ext)) {
            return cb(new Error('Formato no soportado. Usa mp3, ogg, wav, webm o m4a (máx. 5 MB).'));
        }
        cb(null, true);
    },
}).single('file');

function handleUpload(req, res, next) {
    upload(req, res, (err) => {
        if (err) {
            const msg =
                err.code === 'LIMIT_FILE_SIZE'
                    ? 'El archivo supera el límite de 5 MB.'
                    : err.message || 'Error al procesar el archivo.';
            return sendProblem(res, 400, 'INVALID_FILE', msg);
        }
        return next();
    });
}

function createSoundsRouter(client) {
    const router = express.Router();

    // ─── Catálogo de Soundboard ─────────────────────────────
    router.get('/sounds', (req, res) => {
        res.json(listSounds());
    });

    // ─── Preview de sonido ──────────────────────────────────
    router.get('/sounds/:id/preview', validateParams(schemas.params.soundId), (req, res, next) => {
        try {
            const { filePath, mime } = getSoundPreview(req.params.id);
            res.setHeader('Content-Type', mime);
            const stream = fs.createReadStream(filePath);
            stream.on('error', (err) => {
                if (!res.headersSent) next(err);
            });
            stream.pipe(res);
        } catch (err) {
            next(err);
        }
    });

    // ─── Reproducir sonido en Discord ───────────────────────
    router.post(
        '/sounds/play',
        requireAuth,
        requireUser,
        validateBody(schemas.body.soundPlay),
        async (req, res, next) => {
            try {
                const { guildId, channelId, soundId, volume } = req.body;
                const result = await playSound({ client, guildId, channelId, soundId, volume });
                res.json(result);
            } catch (err) {
                next(err);
            }
        }
    );

    // ─── Subir nuevo sonido con audio ───────────────────────
    router.post('/sounds/upload', requireAuth, requireUser, handleUpload, async (req, res, next) => {
        if (!req.file) {
            return sendProblem(res, 400, 'FILE_REQUIRED', 'Falta el archivo de audio (campo "file").');
        }

        const name = String(req.body?.name || '').trim();
        if (!name) {
            fsp.unlink(req.file.path).catch(() => {});
            return sendProblem(res, 400, 'NAME_REQUIRED', 'El campo "name" es obligatorio.');
        }

        try {
            const result = await uploadSound({
                name,
                emoji: req.body?.emoji,
                category: req.body?.category,
                duration: req.body?.duration,
                file: req.file,
                userId: req.discordUserId || req.body?.userId,
            });
            return res.status(201).json(result);
        } catch (err) {
            fsp.unlink(req.file.path).catch(() => {});
            return next(err);
        }
    });

    // ─── Adjuntar / Reemplazar audio de sonido existente ────
    router.put(
        '/sounds/:id/file',
        requireAuth,
        requireUser,
        validateParams(schemas.params.soundId),
        handleUpload,
        async (req, res, next) => {
            if (!req.file) {
                return sendProblem(res, 400, 'FILE_REQUIRED', 'Falta el archivo de audio (campo "file").');
            }
            try {
                const result = await attachSoundFile({
                    id: req.params.id,
                    file: req.file,
                    duration: req.body?.duration,
                });
                return res.json(result);
            } catch (err) {
                fsp.unlink(req.file.path).catch(() => {});
                return next(err);
            }
        }
    );

    // ─── Actualizar metadatos de sonido ─────────────────────
    router.put(
        '/sounds/:id',
        requireAuth,
        requireUser,
        validateParams(schemas.params.soundId),
        validateBody(schemas.body.soundUpdate),
        (req, res, next) => {
            try {
                const result = updateSound({ id: req.params.id, data: req.body });
                res.json(result);
            } catch (err) {
                next(err);
            }
        }
    );

    // ─── Eliminar sonido ────────────────────────────────────
    router.delete(
        '/sounds/:id',
        requireAuth,
        requireUser,
        validateParams(schemas.params.soundId),
        (req, res, next) => {
            try {
                const result = removeSound({ id: req.params.id });
                res.json(result);
            } catch (err) {
                next(err);
            }
        }
    );

    return router;
}

module.exports = { createSoundsRouter };
