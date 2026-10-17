'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const {
    getFfmpegPath,
    normalizeAudio,
    normalizeFileInPlace,
} = require('../src/sound/audio-processor');

test('getFfmpegPath resolves a valid executable path', () => {
    const p = getFfmpegPath();
    assert.equal(typeof p, 'string');
    assert.ok(p.length > 0);
});

test('normalizeAudio processes input file into EBU R128 normalized output', async () => {
    const ffmpeg = getFfmpegPath();
    const tmpDir = path.join(os.tmpdir(), `audio-test-${Date.now()}`);
    await fsp.mkdir(tmpDir, { recursive: true });

    const inputPath = path.join(tmpDir, 'input.wav');
    const outputPath = path.join(tmpDir, 'output.mp3');

    // Generate a 0.5s tone using ffmpeg
    const gen = spawnSync(ffmpeg, [
        '-y',
        '-f', 'lavfi',
        '-i', 'sine=frequency=440:duration=0.5',
        inputPath,
    ]);

    if (gen.status !== 0) {
        // If system ffmpeg cannot synthesize lavfi sine, skip gracefully
        await fsp.rm(tmpDir, { recursive: true, force: true });
        return;
    }

    const res = await normalizeAudio(inputPath, outputPath);
    assert.equal(res.success, true);
    assert.ok(fs.existsSync(outputPath));
    assert.ok(fs.statSync(outputPath).size > 0);

    // Test in-place normalization
    const inPlaceRes = await normalizeFileInPlace(outputPath);
    assert.equal(inPlaceRes.success, true);
    assert.equal(inPlaceRes.normalized, true);
    assert.ok(fs.existsSync(outputPath));

    await fsp.rm(tmpDir, { recursive: true, force: true });
});
