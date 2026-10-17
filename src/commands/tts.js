'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const voiceManager = require('../voice/voiceManager');
const { VOICES, getVoiceById } = require('../tts/voiceRegistry');
const voicePreferences = require('../tts/voicePreferences');
const config = require('../config');
const { getMemberVoiceChannel, hasVoicePermissions, replyEphemeral } = require('./_shared');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tts')
        .setDescription('Sintetiza texto en voz y lo reproduce en tu canal de voz.')
        .addStringOption((option) =>
            option
                .setName('texto')
                .setDescription('El texto que dirá el bot')
                .setRequired(true)
                .setMaxLength(config.bot.maxTtsLength)
        )
        .addStringOption((option) =>
            option
                .setName('voz')
                .setDescription('Opcional: Cambiar la voz solo para este mensaje')
                .setRequired(false)
                .setAutocomplete(true)
        )
        .addStringOption((option) =>
            option
                .setName('velocidad')
                .setDescription('Velocidad de reproducción')
                .setRequired(false)
                .addChoices(
                    { name: 'Muy Lenta (-20%)', value: '-20%' },
                    { name: 'Lenta (-10%)', value: '-10%' },
                    { name: 'Normal (0%)', value: '+0%' },
                    { name: 'Rápida (+15%)', value: '+15%' },
                    { name: 'Muy Rápida (+30%)', value: '+30%' }
                )
        ),

    /**
     * Autocompletado para el parámetro de voz
     */
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const filtered = VOICES.filter(
            (v) =>
                v.name.toLowerCase().includes(focusedValue) ||
                v.id.toLowerCase().includes(focusedValue) ||
                v.lang.toLowerCase().includes(focusedValue)
        ).slice(0, 25);

        await interaction.respond(
            filtered.map((v) => ({
                name: `${v.flag} ${v.name} (${v.gender})`,
                value: v.id,
            }))
        );
    },

    async execute(interaction) {
        const memberVoiceChannel = getMemberVoiceChannel(interaction);
        if (!memberVoiceChannel) {
            return replyEphemeral(interaction, '❌ Debes estar en un canal de voz para usar el comando TTS.');
        }

        if (!hasVoicePermissions(memberVoiceChannel, interaction.client.user)) {
            return replyEphemeral(interaction, '❌ No tengo permisos suficientes para unirme y hablar en ese canal de voz.');
        }

        let text = interaction.options.getString('texto');
        let voiceId = interaction.options.getString('voz');
        const speed = interaction.options.getString('velocidad') || '+0%';

        // Detección si el usuario escribió la voz dentro del texto:
        if (!voiceId) {
            const voiceMatch = text.match(/(?:^|\s+)(?:voz|voice|:)\s*([a-zA-Z0-9_\-()áéíóúÁÉÍÓÚ ]+)$/i);
            if (voiceMatch) {
                const potentialVoice = voiceMatch[1].trim();
                const matched = getVoiceById(potentialVoice);
                if (matched) {
                    voiceId = matched.id;
                    text = text.substring(0, text.lastIndexOf(voiceMatch[0])).trim();
                }
            }
        }

        // Si no se especificó ninguna voz, usar la voz predeterminada del usuario
        if (!voiceId) {
            voiceId = voicePreferences.getUserVoice(interaction.user.id);
        }

        await interaction.deferReply();

        const session = voiceManager.getSession(interaction.guildId);
        session.connect(memberVoiceChannel);

        session.enqueue({
            text,
            voiceId,
            options: { rate: speed },
            onStart: (voice) => {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.color)
                    .setTitle(`🔊 Hablando: ${voice.flag || '🗣️'} ${voice.name}`)
                    .setDescription(`💬 **"${text}"**`)
                    .setFooter({
                        text: `Solicitado por ${interaction.user.username}`,
                        iconURL: interaction.user.displayAvatarURL(),
                    })
                    .setTimestamp();

                interaction.editReply({ embeds: [embed] }).catch(() => {});
            },
            onError: (err) => {
                interaction.editReply({
                    content: `❌ Error al reproducir TTS: ${err.message}`,
                }).catch(() => {});
            },
        });
    },
};
