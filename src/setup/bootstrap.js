'use strict';

const fs = require('node:fs');
const path = require('node:path');
const report = require('./report');

const ROOT = path.join(__dirname, '..', '..');
const MIN_NODE = [20, 0, 0];

function nodeVersionOk(version = process.versions.node) {
    const parts = version.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if (parts[i] !== MIN_NODE[i]) return parts[i] > MIN_NODE[i];
    }
    return true;
}

function missingPackages(root = ROOT) {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    return Object.keys(pkg.dependencies || {}).filter((name) => {
        try {
            require.resolve(`${name}/package.json`, { paths: [root] });
            return false;
        } catch {
            try {
                require.resolve(name, { paths: [root] });
                return false;
            } catch {
                return true;
            }
        }
    });
}

function run(root = ROOT) {
    report.title('ignite-sound startup check');

    if (!nodeVersionOk()) {
        report.fail(`Node.js ${process.versions.node} is too old (20.0.0 or newer is required)`, [
            'Install the current LTS version from https://nodejs.org.',
        ]);
        report.stop(1);
    }
    report.ok(`Node.js ${process.versions.node}`);

    const missing = missingPackages(root);
    if (missing.length > 0) {
        report.fail('npm packages are missing', [
            `Missing dependencies: ${missing.join(', ')}`,
            'Run "npm install" before starting the bot.',
        ]);
        report.stop(missing.length);
    }
    report.ok('Dependencies verified');

    // Proceed to launch
    const launcher = require('./launcher');
    launcher.main();
}

module.exports = {
    nodeVersionOk,
    missingPackages,
    run,
};
