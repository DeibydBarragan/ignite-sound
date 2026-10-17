'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const logger = require('../core/logger');

const log = logger.createLogger('audio-processor');

/**
 * Resolves the path to the ffmpeg executable (ffmpeg-static or PATH).
 * @returns {string}
 */
function getFfmpegPath() {
    try {
        const staticPath = require('ffmpeg-static');
        if (staticPath && fs.existsSync(staticPath)) {
            return staticPath;
        }
    } catch {}
    return 'ffmpeg';
}

/**
 * Normalizes an audio file using FFmpeg EBU R128 (loudnorm).
 * E.g., target -16 LUFS, true peak -1.5 dB, 48000 Hz sample rate.
 *
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {{ targetLufs?: number, truePeak?: number, lra?: number, sampleRate?: number, bitrate?: string, trimSilence?: boolean, silenceThreshold?: number, silenceDuration?: number }} [options]
 * @returns {Promise<{ success: boolean, outputPath: string }>}
 */
function normalizeAudio(inputPath, outputPath, options = {}) {
    const {
        targetLufs = -16,
        truePeak = -1.5,
        lra = 11,
        sampleRate = 48000,
        bitrate = '192k',
        trimSilence = true,
        silenceThreshold = -50,
        silenceDuration = 0.03,
    } = options;

    const ffmpeg = getFfmpegPath();
    const filters = [];

    if (trimSilence) {
        const trim = `silenceremove=start_periods=1:start_duration=${silenceDuration}:start_threshold=${silenceThreshold}dB`;
        filters.push(trim, 'areverse', trim, 'areverse');
    }

    filters.push(`loudnorm=I=${targetLufs}:TP=${truePeak}:LRA=${lra}`);
    const filter = filters.join(',');

    const args = [
        '-y',
        '-i', inputPath,
        '-af', filter,
        '-ar', String(sampleRate),
        '-c:a', 'libmp3lame',
        '-b:a', bitrate,
        outputPath,
    ];

    return new Promise((resolve, reject) => {
        const child = spawn(ffmpeg, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stderr = '';

        child.stderr?.on('data', (chunk) => {
            stderr += chunk.toString();
        });

        child.on('error', (err) => {
            log.warn(`FFmpeg spawn error on ${path.basename(inputPath)}:`, err.message);
            reject(err);
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true, outputPath });
            } else {
                const msg = `FFmpeg exited with code ${code}: ${stderr.slice(-300).trim()}`;
                log.warn(`Audio normalization failed for ${path.basename(inputPath)}:`, msg);
                reject(new Error(msg));
            }
        });
    });
}

/**
 * Normalizes an audio file in-place using an atomic temporary swap.
 * Leaves original intact if FFmpeg fails.
 *
 * @param {string} filePath
 * @param {Parameters<typeof normalizeAudio>[2]} [options]
 * @returns {Promise<{ success: boolean, normalized: boolean, error?: string }>}
 */
async function normalizeFileInPlace(filePath, options = {}) {
    const tempPath = `${filePath}.norm-${Date.now()}.mp3`;

    try {
        await normalizeAudio(filePath, tempPath, options);
        await fsp.rename(tempPath, filePath);
        log.info(`Normalized audio in-place: ${path.basename(filePath)} (silence trimmed + -16 LUFS)`);
        return { success: true, normalized: true };
    } catch (err) {
        await fsp.unlink(tempPath).catch(() => {});
        log.warn(`Could not normalize ${path.basename(filePath)}; keeping original:`, err.message);
        return { success: false, normalized: false, error: err.message };
    }
}

module.exports = {
    getFfmpegPath,
    normalizeAudio,
    normalizeFileInPlace,
};
