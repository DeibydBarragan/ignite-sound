'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const soundManager = require('../sound/SoundManager');
const config = require('../config');

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB, igual que la API
const AUDIO_EXTS = new Set(['.mp3', '.ogg', '.oga', '.wav', '.webm', '.m4a']);
const CATEGORIES = ['memes', 'gaming', 'reactions', 'sfx', 'anime'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sound-add')
        .setDescription('Añade un efecto nuevo al soundboard con un archivo de audio.')
        .addStringOption((option) =>
            option
                .setName('nombre')
                .setDescription('Nombre del sonido (ej. Victory, Bruh, Oof)')
                .setRequired(true)
                .setMaxLength(60)
        )
        .addAttachmentOption((option) =>
            option
                .setName('archivo')
                .setDescription('Archivo de audio mp3, ogg, wav, webm o m4a (máx. 5 MB)')
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName('categoria')
                .setDescription('Categoría del sonido')
                .setRequired(false)
                .addChoices(...CATEGORIES.map((c) => ({ name: c, value: c })))
        )
        .addStringOption((option) =>
            option
                .setName('emoji')
                .setDescription('Emoji representativo (opcional)')
                .setRequired(false)
                .setMaxLength(4)
        ),

    async execute(interaction) {
        const name = (interaction.options.getString('nombre') || '').trim();
        const attachment = interaction.options.getAttachment('archivo');
        const category = interaction.options.getString('categoria') || 'memes';
        const emoji = (interaction.options.getString('emoji') || '').trim() || '🎵';

        if (!name) {
            return interaction.reply({
                content: '❌ El nombre no puede estar vacío.',
                flags: MessageFlags.Ephemeral,
            });
        }
        if (!attachment) {
            return interaction.reply({
                content: '❌ Adjunta un archivo de audio.',
                flags: MessageFlags.Ephemeral,
            });
        }

        const ext = path.extname(attachment.name || '').toLowerCase();
        const isAudio =
            AUDIO_EXTS.has(ext) || (attachment.contentType || '').startsWith('audio/');
        if (!isAudio) {
            return interaction.reply({
                content: '❌ Formato no soportado. Usa mp3, ogg, wav, webm o m4a.',
                flags: MessageFlags.Ephemeral,
            });
        }
        if ((attachment.size || 0) > MAX_BYTES) {
            return interaction.reply({
                content: '❌ El archivo supera el límite de 5 MB.',
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.deferReply();

        try {
            const response = await fetch(attachment.url);
            if (!response.ok) {
                throw new Error(`No se pudo descargar el adjunto (HTTP ${response.status}).`);
            }
            const buffer = Buffer.from(await response.arrayBuffer());
            if (!buffer.length) {
                throw new Error('El archivo descargado está vacío.');
            }

            const safeExt = AUDIO_EXTS.has(ext) ? ext : '.mp3';
            const filename = `snd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`;
            const dest = path.join(soundManager.audioDir, filename);
            await fs.promises.writeFile(dest, buffer);

            let sound;
            try {
                sound = soundManager.add({
                    name,
                    emoji,
                    category: CATEGORIES.includes(category) ? category : 'memes',
                    duration: 2,
                    preset: 'tada',
                    file: filename,
                });
            } catch (err) {
                await fs.promises.unlink(dest).catch(() => {});
                throw err;
            }

            const kb = Math.max(1, Math.round(buffer.length / 1024));
            const embed = new EmbedBuilder()
                .setColor(config.bot.color)
                .setTitle(`🔊 ${sound.emoji || '🔊'} ${sound.name}`)
                .setDescription(
                    `Añadido al soundboard.\nCategoría: **${sound.category}** · Tamaño: **${kb} KB**\nÚsalo con \`/sound nombre:${sound.name}\` o desde el dashboard.`
                )
                .setFooter({
                    text: `Añadido por ${interaction.user.username}`,
                    iconURL: interaction.user.displayAvatarURL(),
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] }).catch(() => {});
        } catch (err) {
            console.error('[Command /sound-add] Error guardando sonido:', err);
            await interaction
                .editReply({
                    content: `❌ No se pudo guardar el sonido: ${err.message || 'error desconocido'}`,
                })
                .catch(() => {});
        }
    },
};
