'use strict';

const { GuildVoiceSession } = require('./voice-session');
const logger = require('../core/logger');

const log = logger.createLogger('voice-manager');

class VoiceManager {
    constructor() {
        this.sessions = new Map();
        this.client = null;
    }

    /**
     * @param {import('discord.js').Client} client
     */
    setClient(client) {
        this.client = client;
    }

    /**
     * @param {string} guildId
     * @returns {InstanceType<typeof GuildVoiceSession>}
     */
    getSession(guildId) {
        if (!this.sessions.has(guildId)) {
            const session = new GuildVoiceSession(guildId);
            this.sessions.set(guildId, session);
        }
        return this.sessions.get(guildId);
    }

    /**
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
     * Cleanly leaves and destroys all active voice sessions.
     */
    leaveAll() {
        for (const session of this.sessions.values()) {
            try {
                session.destroy();
            } catch {}
        }
        this.sessions.clear();
    }

    /**
     * Handles voice state changes to automatically disconnect when alone or moved.
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

            if (!botChannel) {
                if ((botId && (newState.id === botId || oldState.id === botId)) || !session.channel) {
                    session.destroy();
                    this.sessions.delete(guildId);
                } else {
                    session.evaluateEmptyLeave();
                }
                return;
            }

            session.updateChannel(botChannel);
            session.evaluateEmptyLeave();
        } catch (err) {
            log.warn('Error in handleVoiceStateUpdate:', err.message);
        }
    }
}

const defaultVoiceManager = new VoiceManager();

module.exports = Object.assign(defaultVoiceManager, { VoiceManager });

