'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { VOICES } = require('../tts/voiceRegistry');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voices')
        .setDescription('Muestra el catálogo de voces disponibles para el TTS.'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(config.bot.color)
            .setTitle('🎙️ Voces Disponibles para TTS')
            .setDescription('Usa `/setvoice <voz>` para elegir tu voz predeterminada permanente, o `/tts texto:<mensaje>` para hablar.')
            .setTimestamp();

        const loquendoGroup = VOICES.filter((v) => v.provider === 'loquendo')
            .map((v) => `${v.flag} **${v.name}** \`(${v.id})\`\n↳ *${v.description}*`)
            .join('\n');

        const spanishGroup = VOICES.filter((v) => v.provider === 'edge' && v.lang.startsWith('es-'))
            .map((v) => `${v.flag} **${v.name}** \`(${v.id})\``)
            .join('\n');

        const englishGroup = VOICES.filter((v) => v.provider === 'edge' && v.lang.startsWith('en-'))
            .map((v) => `${v.flag} **${v.name}** \`(${v.id})\``)
            .join('\n');

        if (loquendoGroup) {
            embed.addFields({ name: '🗿 Loquendo Clásico', value: loquendoGroup, inline: false });
        }
        if (spanishGroup) {
            embed.addFields({ name: '🌐 Microsoft Neural (Español)', value: spanishGroup, inline: false });
        }
        if (englishGroup) {
            embed.addFields({ name: '🌍 Microsoft Neural (Inglés)', value: englishGroup, inline: false });
        }

        return interaction.reply({ embeds: [embed] });
    },
};
