'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

function checkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== 'node_modules') {
                checkDir(fullPath);
            }
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            try {
                execSync(`node --check "${fullPath}"`);
                console.log(`✓ ${path.relative(path.join(__dirname, '..'), fullPath)}`);
            } catch (err) {
                console.error(`✗ Error de sintaxis en: ${fullPath}`);
                process.exit(1);
            }
        }
    }
}

console.log('Verificando sintaxis JavaScript en ignite-sound...');
checkDir(path.join(__dirname, '..', 'src'));
checkDir(path.join(__dirname, '..', 'scripts'));
checkDir(path.join(__dirname, '..'));
console.log('✅ Toda la sintaxis es correcta.');
