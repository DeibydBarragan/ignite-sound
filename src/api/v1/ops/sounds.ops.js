'use strict';

const path = require('node:path');
const soundManager = require('../../../sound/sound-manager');
const voiceManager = require('../../../voice/voiceManager');
const { ApiError, serializeSound } = require('../../contracts');
const { resolveVoiceTarget } = require('./voice-target');

function listSounds() {
    const list = soundManager.list() || [];
    const sounds = list.map(serializeSound);
    return {
        total: sounds.length,
        sounds,
    };
}

function getSoundPreview(id) {
    const sound = soundManager.get(id);
    if (!sound) {
        throw new ApiError(404, 'SOUND_NOT_FOUND', 'Sonido no encontrado.');
    }
    const filePath = soundManager.resolveFile(sound);
    if (!filePath) {
        throw new ApiError(
            404,
            'NO_AUDIO_FILE',
            `El sonido "${sound.name}" aún no tiene archivo de audio. Sube un .mp3 para habilitar preview real.`,
            { extra: { sound, code: 'NO_AUDIO_FILE' } }
        );
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime =
        ext === '.mp3' ? 'audio/mpeg'
        : ext === '.ogg' || ext === '.oga' ? 'audio/ogg'
        : ext === '.wav' ? 'audio/wav'
        : ext === '.webm' ? 'audio/webm'
        : 'application/octet-stream';

    return { filePath, mime, sound };
}

async function playSound({ client, guildId, channelId, soundId, volume }) {
    const sound = soundManager.get(soundId);
    if (!sound) {
        throw new ApiError(404, 'SOUND_NOT_FOUND', `Sonido con ID ${soundId} no encontrado.`);
    }

    const { guild, voiceChannel } = resolveVoiceTarget(client, guildId, channelId);

    soundManager.incrementPlays(soundId);

    const filePath = soundManager.resolveFile(sound);
    if (!filePath) {
        throw new ApiError(
            404,
            'NO_AUDIO_FILE',
            `El sonido "${sound.name}" aún no tiene archivo de audio en el bot. Solo preview local disponible.`,
            {
                extra: {
                    sound,
                    code: 'NO_AUDIO_FILE',
                    channel: { id: voiceChannel.id, name: voiceChannel.name },
                },
            }
        );
    }

    const session = voiceManager.getSession(guild.id);
    session.connect(voiceChannel);
    session.enqueue({
        type: 'file',
        filePath,
        label: sound.name,
        volume,
    });

    return {
        success: true,
        message: 'Sonido emitido en Discord con éxito.',
        channel: { id: voiceChannel.id, name: voiceChannel.name },
        sound,
    };
}

const { normalizeFileInPlace } = require('../../../sound/audio-processor');

async function uploadSound({ name, emoji, category, duration, file, userId }) {
    await normalizeFileInPlace(file.path);
    const sound = soundManager.add({
        name,
        emoji,
        category,
        duration,
        preset: 'tada',
        file: path.basename(file.path),
        uploadedBy: userId || null,
    });
    return {
        success: true,
        sound: { ...sound, hasFile: true },
    };
}

async function attachSoundFile({ id, file, duration }) {
    await normalizeFileInPlace(file.path);
    const sound = soundManager.setFile(id, path.basename(file.path), duration);
    if (!sound) {
        throw new ApiError(404, 'SOUND_NOT_FOUND', 'Sonido no encontrado.');
    }
    return { success: true, sound };
}

function updateSound({ id, data }) {
    const updated = soundManager.update(id, data);
    if (!updated) {
        throw new ApiError(404, 'SOUND_NOT_FOUND', 'Sonido no encontrado.');
    }
    return { success: true, sound: updated };
}

function removeSound({ id }) {
    const ok = soundManager.remove(id);
    if (!ok) {
        throw new ApiError(404, 'SOUND_NOT_FOUND', 'Sonido no encontrado.');
    }
    return { success: true };
}

module.exports = {
    listSounds,
    getSoundPreview,
    playSound,
    uploadSound,
    attachSoundFile,
    updateSound,
    removeSound,
};
