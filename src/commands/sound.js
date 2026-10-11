'use strict';

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const voiceManager = require('../voice/voiceManager');
const soundManager = require('../sound/SoundManager');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sound')
        .setDescription('Reproduce un efecto del soundboard en tu canal de voz.')
        .addStringOption((option) =>
            option
                .setName('nombre')
                .setDescription('Nombre del sonido (ej. Airhorn, Bruh, Victory)')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addIntegerOption((option) =>
            option
                .setName('volumen')
                .setDescription('Volumen de 1 a 100 (por defecto 100)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const filtered = soundManager
            .list()
            .filter(
                (s) =>
                    s.name.toLowerCase().includes(focused) ||
                    s.id.toLowerCase().includes(focused) ||
                    (s.category || '').toLowerCase().includes(focused)
            )
            .slice(0, 25);

        await interaction.respond(
            filtered.map((s) => ({
                name: `${s.emoji || '🔊'} ${s.name}${s.hasFile ? '' : ' (sin audio)'}`,
                value: s.id,
            }))
        );
    },

    async execute(interaction) {
        const memberVoiceChannel = interaction.member?.voice?.channel;
        if (!memberVoiceChannel) {
            return interaction.reply({
                content: '❌ Debes estar en un canal de voz para usar el soundboard.',
                flags: MessageFlags.Ephemeral,
            });
        }

        const permissions = memberVoiceChannel.permissionsFor(interaction.client.user);
        if (permissions && (!permissions.has('Connect') || !permissions.has('Speak'))) {
            return interaction.reply({
                content: '❌ No tengo permisos suficientes para unirme y hablar en ese canal de voz.',
                flags: MessageFlags.Ephemeral,
            });
        }

        const soundId = interaction.options.getString('nombre');
        const volume = interaction.options.getInteger('volumen') ?? 100;

        const sound = soundManager.get(soundId);
        if (!sound) {
            return interaction.reply({
                content: '❌ Sonido no encontrado. Usa el autocompletado para elegir uno del catálogo.',
                flags: MessageFlags.Ephemeral,
            });
        }

        const filePath = soundManager.resolveFile(sound);
        if (!filePath) {
            return interaction.reply({
                content: `⚠️ **${sound.emoji || '🔊'} ${sound.name}** aún no tiene archivo de audio en el bot. Súbelo con \`/sound-add\` o desde el dashboard para habilitarlo en Discord.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.deferReply();

        soundManager.incrementPlays(soundId);

        const session = voiceManager.getSession(interaction.guildId);
        session.connect(memberVoiceChannel);

        session.enqueue({
            type: 'file',
            filePath,
            label: sound.name,
            volume,
            onStart: () => {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.color)
                    .setTitle(`🔊 ${sound.emoji || '🔊'} ${sound.name}`)
                    .setDescription(`Reproducido en **${memberVoiceChannel.name}**`)
                    .setFooter({
                        text: `Solicitado por ${interaction.user.username}`,
                        iconURL: interaction.user.displayAvatarURL(),
                    })
                    .setTimestamp();

                interaction.editReply({ embeds: [embed] }).catch(() => {});
            },
            onError: (err) => {
                interaction.editReply({
                    content: `❌ Error al reproducir sonido: ${err.message}`,
                }).catch(() => {});
            },
        });
    },
};
