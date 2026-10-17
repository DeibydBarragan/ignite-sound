'use strict';

const fs = require('node:fs');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    StreamType,
} = require('@discordjs/voice');
const config = require('../config');
const ttsManager = require('../tts/TtsManager');
const { withVoiceLock } = require('./voice-lock');
const logger = require('../core/logger');

const log = logger.createLogger('voice-session');

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
            log.error(`[Guild ${this.guildId}] AudioPlayer error:`, error.message);
            this.isPlaying = false;
            this.processNext();
        });
    }

    connect(channel) {
        if (this.connection && this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
            if (this.channelId && channel && this.channelId === channel.id) {
                this.updateChannel(channel);
                this.cancelEmptyTimer();
                return this.connection;
            }
            if (this.channelId && channel && this.channelId !== channel.id) {
                try { this.connection.destroy(); } catch {}
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

    updateChannel(channel) {
        if (channel) {
            this.channel = channel;
            this.channelId = channel.id;
        }
    }

    isAlone() {
        try {
            if (!this.channel?.members) return false;
            const members = this.channel.members.values
                ? Array.from(this.channel.members.values())
                : Array.from(this.channel.members);
            const humans = members.filter((m) => m?.user && !m.user.bot);
            return humans.length === 0;
        } catch {
            return false;
        }
    }

    enqueue(item) {
        const normalized = {
            ...item,
            type: item.type || (item.filePath || item.file ? 'file' : 'tts'),
            filePath: item.filePath || item.file,
        };
        this.cancelEmptyTimer();
        this.queue.push(normalized);
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.processNext().catch((err) => {
                log.error(`[Guild ${this.guildId}] Enqueue error:`, err.message);
            });
        }
    }

    async processNext() {
        return withVoiceLock(this.guildId, async () => {
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
                        log.warn(`[Guild ${this.guildId}] Waiting for Ready state:`, e.message);
                    }
                }

                if (current.type === 'file') {
                    const filePath = current.filePath;
                    if (!filePath || !fs.existsSync(filePath)) {
                        throw new Error('Archivo de sonido no encontrado en el bot.');
                    }
                    const stream = fs.createReadStream(filePath);
                    stream.on('error', (err) => log.error(`[Guild ${this.guildId}] Stream error:`, err.message));

                    const resource = createAudioResource(stream, {
                        inputType: StreamType.Arbitrary,
                        inlineVolume: true,
                    });
                    if (current.volume !== undefined && resource.volume) {
                        const v = Math.max(0, Math.min(100, Number(current.volume) || 100)) / 100;
                        resource.volume.setVolume(v);
                    }
                    this.player.play(resource);
                    current.onStart?.({ name: current.label || 'Soundboard' });
                    return;
                }

                const { stream, voice } = await ttsManager.generateAudio(
                    current.text,
                    current.voiceId,
                    current.options || {}
                );
                stream.on('error', (err) => log.error(`[Guild ${this.guildId}] TTS stream error:`, err.message));

                const resource = createAudioResource(stream, {
                    inputType: StreamType.Arbitrary,
                    inlineVolume: true,
                });
                this.player.play(resource);
                current.onStart?.(voice);
            } catch (err) {
                log.error(`[Guild ${this.guildId}] Playback error:`, err.message);
                current.onError?.(err);
                this.isPlaying = false;
                this.processNext();
            }
        });
    }

    stop() {
        this.queue = [];
        this.player.stop(true);
        this.isPlaying = false;
        this.evaluateEmptyLeave();
    }

    cancelEmptyTimer() {
        if (this.leaveTimeout) {
            clearTimeout(this.leaveTimeout);
            this.leaveTimeout = null;
        }
    }

    scheduleEmptyLeave(force = false) {
        if (this.leaveTimeout) {
            if (!force) return;
            this.cancelEmptyTimer();
        }

        const delayMs = config.bot.leaveOnEmptyMs || config.bot.leaveOnEmpty * 1000;
        if (!delayMs || delayMs <= 0 || !this.connection || !this.isAlone()) return;

        this.leaveTimeout = setTimeout(() => {
            this.leaveTimeout = null;
            if (!this.connection || !this.isAlone()) return;
            if (this.isPlaying || this.queue.length > 0) {
                this.scheduleEmptyLeave(true);
                return;
            }
            log.info(`[Guild ${this.guildId}] Empty voice channel; leaving.`);
            this.destroy();
        }, delayMs);
    }

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

    destroy() {
        this.cancelEmptyTimer();
        this.queue = [];
        this.isPlaying = false;
        try { this.player.stop(true); } catch {}
        if (this.connection) {
            try { this.connection.destroy(); } catch {}
            this.connection = null;
        }
        this.channel = null;
        this.channelId = null;
    }
}

module.exports = { GuildVoiceSession };
