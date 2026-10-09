'use strict';

const express = require('express');
const cors = require('cors');
const ttsManager = require('../tts/TtsManager');
const voiceManager = require('../voice/voiceManager');
const config = require('../config');

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

    return app;
}

module.exports = { createApiServer };
