'use strict';

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { VOICES, getVoiceById } = require('../tts/voiceRegistry');
const voicePreferences = require('../tts/voicePreferences');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setvoice')
        .setDescription('Elige tu voz predeterminada permanente para el comando /tts.')
        .addStringOption((option) =>
            option
                .setName('voz')
                .setDescription('Selecciona la voz que deseas usar por defecto')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    /**
     * Autocompletado de voces
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
        const voiceInput = interaction.options.getString('voz');
        const voice = getVoiceById(voiceInput);

        if (!voice) {
            return interaction.reply({
                content: '❌ No se encontró esa voz. Por favor selecciona una voz válida del menú desplegable.',
                flags: MessageFlags.Ephemeral,
            });
        }

        voicePreferences.setUserVoice(interaction.user.id, voice.id);

        const embed = new EmbedBuilder()
            .setColor(config.bot.color)
            .setTitle('🎙️ Voz Predeterminada Guardada')
            .setDescription(
                `Tu voz predeterminada ahora es: **${voice.flag} ${voice.name}**\n\n` +
                `De ahora en adelante, cada vez que uses \`/tts texto: ...\`, el bot hablará automáticamente con esta voz sin que tengas que elegirla de nuevo.`
            )
            .setFooter({
                text: interaction.user.username,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};
