'use strict';

const fs = require('node:fs');
const path = require('node:path');
const soundManager = require('../src/sound/sound-manager');
const { normalizeFileInPlace, getFfmpegPath } = require('../src/sound/audio-processor');

const AUDIO_EXTS = new Set(['.mp3', '.ogg', '.oga', '.wav', '.webm', '.m4a']);

async function run() {
    console.log('--- Ignite Sound: Batch Audio Normalizer ---');
    console.log(`Using FFmpeg at: ${getFfmpegPath()}`);
    console.log(`Audio directory: ${soundManager.audioDir}\n`);

    if (!fs.existsSync(soundManager.audioDir)) {
        console.log('Audio directory does not exist yet. Nothing to normalize.');
        return;
    }

    const files = fs.readdirSync(soundManager.audioDir).filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return AUDIO_EXTS.has(ext) && !file.includes('.norm-');
    });

    if (files.length === 0) {
        console.log('No audio files found to normalize.');
        return;
    }

    console.log(`Found ${files.length} audio file(s). Starting normalization (-16 LUFS, -1.5 TP, 48kHz)...\n`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = path.join(soundManager.audioDir, file);
        process.stdout.write(`[${i + 1}/${files.length}] Processing ${file}... `);

        const result = await normalizeFileInPlace(filePath);
        if (result.success) {
            console.log('OK');
            successCount++;
        } else {
            console.log(`FAILED (${result.error})`);
            failCount++;
        }
    }

    console.log(`\nCompleted: ${successCount} normalized, ${failCount} failed.`);
}

run().catch((err) => {
    console.error('Fatal error during batch normalization:', err);
    process.exit(1);
});
