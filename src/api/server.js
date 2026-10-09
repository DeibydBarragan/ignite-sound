'use strict';

const express = require('express');
const cors = require('cors');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');
const ttsManager = require('../tts/TtsManager');
const soundManager = require('../sound/SoundManager');
const voiceManager = require('../voice/voiceManager');
const config = require('../config');

/**
 * Resuelve guild + canal de voz objetivo con la misma política que /api/tts/speak:
 * 1) channelId explícito, 2) canal actual del bot, 3) canal con usuarios, 4) primer canal de voz.
 * @returns {{ guild: import('discord.js').Guild, voiceChannel: import('discord.js').VoiceChannel } | { error: string, status: number }}
 */
function resolveVoiceTarget(client, guildId, channelId) {
    const targetGuildId = guildId || config.discord.guildId || client.guilds?.cache.first()?.id;
    if (!targetGuildId) {
        return { error: 'No se especificó un servidor de Discord.', status: 400 };
    }
    const guild = client.guilds.cache.get(targetGuildId);
    if (!guild) {
        return { error: `Servidor con ID ${targetGuildId} no encontrado.`, status: 404 };
    }
    let voiceChannel = null;
    if (channelId) {
        voiceChannel = guild.channels.cache.get(channelId) || null;
    }
    if (!voiceChannel) {
        const botVoiceState = guild.members.me?.voice;
        if (botVoiceState?.channel) {
            voiceChannel = botVoiceState.channel;
        } else {
            // Canal con usuarios reales (los bots no cuentan) o primer canal de voz
            const hasRealUser = (c) =>
                c.isVoiceBased() &&
                c.members.filter((m) => m?.user && m.user.bot === false).size > 0;
            voiceChannel =
                guild.channels.cache.find(hasRealUser) ||
                guild.channels.cache.find((c) => c.isVoiceBased()) ||
                null;
        }
    }
    if (!voiceChannel) {
        return { error: 'No se encontró un canal de voz activo en el servidor.', status: 400 };
    }
    return { guild, voiceChannel };
}

function createApiServer(client) {
    const app = express();

    app.use(cors());
    app.use(express.json());

    // ─── Estado del bot ─────────────────────────────────────────
    app.get('/api/status', (req, res) => {
        res.json({
            status: 'online',
            service: 'ignite-sound',
            uptime: process.uptime(),
            guilds: client.guilds ? client.guilds.cache.size : 0,
            timestamp: new Date().toISOString(),
        });
    });

    // ─── Listado de Voces ───────────────────────────────────────
    app.get('/api/voices', (req, res) => {
        res.json({
            total: ttsManager.getVoices().length,
            voices: ttsManager.getVoices(),
        });
    });

    // ─── Preview de Audio (Web Audio Player) ────────────────────
    app.post('/api/tts/preview', async (req, res) => {
        try {
            const { text, voice, rate, pitch } = req.body;
            if (!text || typeof text !== 'string') {
                return res.status(400).json({ error: 'El campo "text" es obligatorio.' });
            }

            const { stream, format } = await ttsManager.generateAudio(text, voice, { rate, pitch });

            res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'audio/webm');
            stream.pipe(res);
        } catch (err) {
            console.error('[API /tts/preview] Error generando audio:', err);
            res.status(500).json({ error: err.message || 'Error sintetizando audio' });
        }
    });

    // ─── Emitir en Discord desde la Web ─────────────────────────
    app.post('/api/tts/speak', async (req, res) => {
        try {
            const { guildId, channelId, text, voice, rate, pitch } = req.body;
            if (!text || typeof text !== 'string') {
                return res.status(400).json({ error: 'El campo "text" es obligatorio.' });
            }

            const targetGuildId = guildId || config.discord.guildId || client.guilds?.cache.first()?.id;
            if (!targetGuildId) {
                return res.status(400).json({ error: 'No se especificó un servidor de Discord.' });
            }

            const guild = client.guilds.cache.get(targetGuildId);
            if (!guild) {
                return res.status(404).json({ error: `Servidor con ID ${targetGuildId} no encontrado.` });
            }

            let voiceChannel = null;
            if (channelId) {
                voiceChannel = guild.channels.cache.get(channelId);
            }

            if (!voiceChannel) {
                const botVoiceState = guild.members.me?.voice;
                if (botVoiceState?.channel) {
                    voiceChannel = botVoiceState.channel;
                } else {
                    // Buscar canal con usuarios reales (los bots no cuentan) o el primer canal de voz disponible
                    const hasRealUser = (c) =>
                        c.isVoiceBased() &&
                        c.members.filter((m) => m?.user && m.user.bot === false).size > 0;
                    voiceChannel =
                        guild.channels.cache.find(hasRealUser) ||
                        guild.channels.cache.find((c) => c.isVoiceBased());
                }
            }

            if (!voiceChannel) {
                return res.status(400).json({ error: 'No se encontró un canal de voz activo en el servidor.' });
            }

            const session = voiceManager.getSession(guild.id);
            session.connect(voiceChannel);

            session.enqueue({
                text,
                voiceId: voice,
                options: { rate, pitch },
            });

            return res.json({
                success: true,
                message: 'TTS emitido en Discord con éxito.',
                channel: { id: voiceChannel.id, name: voiceChannel.name },
                voice: voice || config.bot.defaultVoice,
                text,
            });
        } catch (err) {
            console.error('[API /tts/speak] Error procesando emisión:', err);
            return res.status(500).json({ error: err.message || 'Error procesando solicitud TTS' });
        }
    });

    // ─── Catálogo de Soundboard ─────────────────────────────
    app.get('/api/sounds', (req, res) => {
        res.json({
            total: soundManager.list().length,
            sounds: soundManager.list(),
        });
    });

    // ─── Preview de sonido (Web Audio Player) ─────────────────
    // Si el sonido aún no tiene binario (file: null), devuelve 404 con
    // code NO_AUDIO_FILE para que el frontend use preview local (Web Audio synth).
    app.get('/api/sounds/:id/preview', (req, res) => {
        const sound = soundManager.get(req.params.id);
        if (!sound) {
            return res.status(404).json({ error: 'Sonido no encontrado.' });
        }
        const filePath = soundManager.resolveFile(sound);
        if (!filePath) {
            return res.status(404).json({
                error: `El sonido "${sound.name}" aún no tiene archivo de audio. Sube un .mp3 para habilitar preview real.`,
                code: 'NO_AUDIO_FILE',
                sound,
            });
        }
        const ext = path.extname(filePath).toLowerCase();
        const mime =
            ext === '.mp3' ? 'audio/mpeg'
            : ext === '.ogg' || ext === '.oga' ? 'audio/ogg'
            : ext === '.wav' ? 'audio/wav'
            : ext === '.webm' ? 'audio/webm'
            : 'application/octet-stream';
        res.setHeader('Content-Type', mime);
        fs.createReadStream(filePath).pipe(res);
    });

    // ─── Reproducir sonido en Discord desde la Web ────────────
    app.post('/api/sounds/play', async (req, res) => {
        try {
            const { guildId, channelId, soundId, volume } = req.body;
            if (!soundId || typeof soundId !== 'string') {
                return res.status(400).json({ error: 'El campo "soundId" es obligatorio.' });
            }
            const sound = soundManager.get(soundId);
            if (!sound) {
                return res.status(404).json({ error: `Sonido con ID ${soundId} no encontrado.` });
            }

            const target = resolveVoiceTarget(client, guildId, channelId);
            if (target.error) {
                return res.status(target.status).json({ error: target.error });
            }
            const { guild, voiceChannel } = target;

            soundManager.incrementPlays(soundId);

            const filePath = soundManager.resolveFile(sound);
            if (!filePath) {
                return res.status(404).json({
                    error: `El sonido "${sound.name}" aún no tiene archivo de audio en el bot. Solo preview local disponible.`,
                    code: 'NO_AUDIO_FILE',
                    sound,
                    channel: { id: voiceChannel.id, name: voiceChannel.name },
                });
            }

            const session = voiceManager.getSession(guild.id);
            session.connect(voiceChannel);
            session.enqueue({
                type: 'file',
                filePath,
                label: sound.name,
                volume,
            });

            return res.json({
                success: true,
                message: 'Sonido emitido en Discord con éxito.',
                channel: { id: voiceChannel.id, name: voiceChannel.name },
                sound,
            });
        } catch (err) {
            console.error('[API /sounds/play] Error procesando emisión:', err);
            return res.status(500).json({ error: err.message || 'Error procesando solicitud de sonido' });
        }
    });

    // ─── Subida de audios (Soundboard) ──────────────────────
    const MAX_SOUND_BYTES = 5 * 1024 * 1024; // 5 MB
    const AUDIO_EXTS = new Set(['.mp3', '.ogg', '.oga', '.wav', '.webm', '.m4a']);
    const SOUND_CATEGORIES = new Set(['memes', 'gaming', 'reactions', 'sfx', 'anime']);

    const soundUpload = multer({
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

    const handleSoundUpload = (req, res, onOk) => {
        soundUpload(req, res, (err) => {
            if (err) {
                const msg =
                    err.code === 'LIMIT_FILE_SIZE'
                        ? 'El archivo supera el límite de 5 MB.'
                        : err.message || 'Error al procesar el archivo.';
                return res.status(400).json({ error: msg });
            }
            if (!req.file) {
                return res.status(400).json({ error: 'Falta el archivo de audio (campo "file").' });
            }
            onOk();
        });
    };

    // POST /api/sounds/upload — crea un sonido nuevo con su .mp3
    // multipart/form-data: file (requerido), name (requerido), emoji, category, duration
    app.post('/api/sounds/upload', (req, res) => {
        handleSoundUpload(req, res, () => {
            const name = String(req.body?.name || '').trim();
            if (!name) {
                try { fs.unlinkSync(req.file.path); } catch {}
                return res.status(400).json({ error: 'El campo "name" es obligatorio.' });
            }
            const category = SOUND_CATEGORIES.has(req.body?.category) ? req.body.category : 'memes';
            try {
                const sound = soundManager.add({
                    name,
                    emoji: String(req.body?.emoji || '🎵').trim() || '🎵',
                    category,
                    duration: req.body?.duration,
                    preset: 'tada',
                    file: path.basename(req.file.path),
                });
                return res.status(201).json({ success: true, sound: { ...sound, hasFile: true } });
            } catch (err) {
                try { fs.unlinkSync(req.file.path); } catch {}
                return res.status(400).json({ error: err.message || 'Error registrando el sonido.' });
            }
        });
    });

    // PUT /api/sounds/:id/file — asocia o reemplaza el audio de un sonido existente
    // (sirve para habilitar en Discord los 12 sonidos iniciales). multipart/form-data: file, duration?
    app.put('/api/sounds/:id/file', (req, res) => {
        handleSoundUpload(req, res, () => {
            const sound = soundManager.setFile(req.params.id, path.basename(req.file.path), req.body?.duration);
            if (!sound) {
                try { fs.unlinkSync(req.file.path); } catch {}
                return res.status(404).json({ error: 'Sonido no encontrado.' });
            }
            return res.json({ success: true, sound });
        });
    });

    // DELETE /api/sounds/:id — elimina el sonido y su binario
    app.delete('/api/sounds/:id', (req, res) => {
        const ok = soundManager.remove(req.params.id);
        if (!ok) {
            return res.status(404).json({ error: 'Sonido no encontrado.' });
        }
        return res.json({ success: true });
    });

    return app;
}

module.exports = { createApiServer };
