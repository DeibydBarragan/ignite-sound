'use strict';

const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    StreamType,
} = require('@discordjs/voice');
const fs = require('node:fs');
const ttsManager = require('../tts/TtsManager');
const config = require('../config');

class GuildVoiceSession {
    constructor(guildId) {
        this.guildId = guildId;
        this.connection = null;
        this.player = createAudioPlayer();
        this.queue = [];
        this.isPlaying = false;
        this.leaveTimeout = null;
        this.channel = null;
        this.channelId = null;

        this.setupPlayerEvents();
    }

    setupPlayerEvents() {
        this.player.on(AudioPlayerStatus.Idle, () => {
            this.isPlaying = false;
            this.processNext();
        });

        this.player.on('error', (error) => {
            console.error(`[Guild ${this.guildId}] Error en AudioPlayer:`, error.message);
            this.isPlaying = false;
            this.processNext();
        });
    }

    connect(channel) {
        // Si ya hay conexión en el mismo canal, reutilizar
        if (this.connection && this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
            if (this.channelId && channel && this.channelId === channel.id) {
                this.updateChannel(channel);
                this.cancelEmptyTimer();
                return this.connection;
            }
            // Si el bot está en otro canal del mismo servidor, moverse: destruir y reconectar
            if (this.channelId && channel && this.channelId !== channel.id) {
                try {
                    this.connection.destroy();
                } catch {}
                this.connection = null;
            } else if (!channel) {
                return this.connection;
            }
        }

        this.connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false,
        });

        this.connection.subscribe(this.player);

        this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            } catch {
                this.destroy();
            }
        });

        this.updateChannel(channel);
        this.cancelEmptyTimer();
        return this.connection;
    }

    /**
     * Actualiza la referencia al canal de voz actual (para conteo de miembros).
     */
    updateChannel(channel) {
        if (channel) {
            this.channel = channel;
            this.channelId = channel.id;
        }
    }

    /**
     * Indica si el bot está solo en el canal (sin usuarios reales).
     * Solo cuentan los miembros con `user.bot === false`.
     * Otro bot NO cuenta como compañía: si solo hay bots, se considera solo.
     * Si no hay referencia al canal, se considera "no solo" para evitar salidas accidentales.
     */
    isAlone() {
        try {
            if (!this.channel || !this.channel.members) return false;
            const humans = this.channel.members.filter((m) => m?.user && m.user.bot === false);
            return humans.size === 0;
        } catch {
            return false;
        }
    }

    /**
     * Encola un item para reproducción.
     * Formatos soportados (retrocompatible con TTS):
     * - TTS: { text, voiceId, options, onStart, onError }
     * - Archivo: { type: 'file', filePath, label, volume (0-100), onStart, onError }
     */
    enqueue(item) {
        const normalized = { ...item };
        if (!normalized.type) {
            normalized.type = normalized.filePath || normalized.file ? 'file' : 'tts';
        }
        if (normalized.file && !normalized.filePath) {
            normalized.filePath = normalized.file;
        }
        this.cancelEmptyTimer(); // Hay actividad: cancelar salida pendiente, se re-evalúa al terminar
        this.queue.push(normalized);
        if (!this.isPlaying) {
            this.processNext();
        }
    }

    /**
     * Procesa y reproduce el siguiente elemento de la cola.
     */
    async processNext() {
        if (this.queue.length === 0) {
            this.isPlaying = false;
            this.evaluateEmptyLeave();
            return;
        }

        this.isPlaying = true;
        const current = this.queue.shift();

        try {
            if (this.connection && this.connection.state.status !== VoiceConnectionStatus.Ready) {
                try {
                    await entersState(this.connection, VoiceConnectionStatus.Ready, 10_000);
                } catch (e) {
                    console.warn(`[Guild ${this.guildId}] Espera de estado Ready:`, e.message);
                }
            }

            const { stream, voice } = await ttsManager.generateAudio(
                current.text,
                current.voiceId,
                current.options || {}
            );

            const resource = createAudioResource(stream, {
                inputType: StreamType.Arbitrary,
                inlineVolume: true,
            });

            this.player.play(resource);

            if (current.onStart) {
                current.onStart(voice);
            }
        } catch (err) {
            console.error(`[Guild ${this.guildId}] Error sintetizando audio:`, err);
            if (current.onError) {
                current.onError(err);
            }
            this.isPlaying = false;
            this.processNext();
        }
    }

    /**
     * Detiene la reproducción actual y limpia la cola.
     */
    stop() {
        this.queue = [];
        this.player.stop(true);
        this.isPlaying = false;
        this.evaluateEmptyLeave();
    }

    /**
     * Cancela el temporizador de salida por canal vacío.
     */
    cancelEmptyTimer() {
        if (this.leaveTimeout) {
            clearTimeout(this.leaveTimeout);
            this.leaveTimeout = null;
        }
    }

    /**
     * Programa la salida solo si el bot está solo en el canal (sin usuarios reales).
     * Si hay usuarios reales presentes, no programa nada: el bot se queda.
     * Si ya hay un timer en curso, lo mantiene para no reiniciar el minuto
     * cuando entra/sale otro bot.
     * @param {boolean} force Reinicia el timer aunque ya exista uno.
     */
    scheduleEmptyLeave(force = false) {
        if (this.leaveTimeout) {
            if (!force) return;
            this.cancelEmptyTimer();
        }

        const delaySec = config.bot.leaveOnEmpty;
        if (!delaySec || delaySec <= 0) return; // 0 = nunca salir
        if (!this.connection) return;
        if (!this.isAlone()) return;

        this.leaveTimeout = setTimeout(() => {
            this.leaveTimeout = null;
            if (!this.connection) return;
            // Re-verificar al momento de salir: si entró un usuario real, quedarse
            if (!this.isAlone()) return;
            // Si está reproduciendo o hay cola, esperar a terminar y re-evaluar
            if (this.isPlaying || this.queue.length > 0) {
                this.scheduleEmptyLeave(true);
                return;
            }
            console.log(`[Guild ${this.guildId}] Canal sin usuarios reales durante ${delaySec}s, saliendo...`);
            this.destroy();
        }, delaySec * 1000);
    }

    /**
     * Evalúa si debe programar o cancelar la salida según ocupación actual.
     * Llamar tras terminar la cola, tras stop(), y en voiceStateUpdate.
     * Solo hay compañía si hay al menos un usuario real (los bots no cuentan).
     */
    evaluateEmptyLeave() {
        if (!this.connection) {
            this.cancelEmptyTimer();
            return;
        }
        if (this.isAlone()) {
            this.scheduleEmptyLeave(false);
        } else {
            this.cancelEmptyTimer();
        }
    }

    /**
     * @deprecated Usar cancelEmptyTimer/evaluateEmptyLeave. Se mantiene por compatibilidad.
     */
    resetInactivityTimer(startNew = false) {
        if (startNew) {
            this.evaluateEmptyLeave();
        } else {
            this.cancelEmptyTimer();
        }
    }

    destroy() {
        this.cancelEmptyTimer();
        this.queue = [];
        this.isPlaying = false;
        try {
            this.player.stop(true);
        } catch {}
        if (this.connection) {
            try {
                this.connection.destroy();
            } catch {}
            this.connection = null;
        }
        this.channel = null;
        this.channelId = null;
        this.cancelEmptyTimer();
    }
}

class VoiceManager {
    constructor() {
        this.sessions = new Map();
        this.client = null;
    }

    /**
     * Registra el cliente de Discord para resolver canales en voiceStateUpdate.
     * @param {import('discord.js').Client} client
     */
    setClient(client) {
        this.client = client;
    }

    /**
     * Obtiene o crea la sesión de voz para un servidor.
     * @param {string} guildId
     * @returns {GuildVoiceSession}
     */
    getSession(guildId) {
        if (!this.sessions.has(guildId)) {
            const session = new GuildVoiceSession(guildId);
            this.sessions.set(guildId, session);
        }
        return this.sessions.get(guildId);
    }

    /**
     * Elimina la sesión de voz y desconecta el bot.
     * @param {string} guildId
     */
    leave(guildId) {
        const session = this.sessions.get(guildId);
        if (session) {
            session.destroy();
            this.sessions.delete(guildId);
        }
    }

    /**
     * Maneja cambios de estado de voz para salir solo si el bot queda solo.
     * - Si el bot se desconecta/expulsa: limpia la sesión.
     * - Si el bot cambia de canal: actualiza referencia y re-evalúa.
     * - Si un usuario entra/sale del canal del bot: programa/cancela salida.
     * @param {import('discord.js').VoiceState} oldState
     * @param {import('discord.js').VoiceState} newState
     */
    handleVoiceStateUpdate(oldState, newState) {
        try {
            const guild = newState.guild || oldState.guild;
            if (!guild) return;
            const guildId = guild.id;
            const session = this.sessions.get(guildId);
            if (!session || !session.connection) return;

            const botId = this.client?.user?.id;
            const botMember = guild.members.me || (botId ? guild.members.cache.get(botId) : null);
            const botChannel = botMember?.voice?.channel || null;

            // El bot fue desconectado/expulsado o ya no está en voz
            if (!botChannel) {
                // Solo limpiar si el que cambió es el bot, o si la sesión perdió su canal
                if ((botId && (newState.id === botId || oldState.id === botId)) || !session.channel) {
                    session.destroy();
                    this.sessions.delete(guildId);
                } else {
                    // Refrescar por si acaso y re-evaluar con la referencia guardada
                    session.evaluateEmptyLeave();
                }
                return;
            }

            // Actualizar referencia al canal actual del bot (cubre moves y refresh de members)
            session.updateChannel(botChannel);
            session.evaluateEmptyLeave();
        } catch (err) {
            console.warn('[VoiceManager] Error en handleVoiceStateUpdate:', err.message);
        }
    }
}

module.exports = new VoiceManager();
