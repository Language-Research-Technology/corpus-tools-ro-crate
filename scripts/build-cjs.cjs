#!/usr/bin/env node

/**
 * Build script to generate CommonJS versions of ES modules
 * This allows the package to be used with both require() and import
 */

const fs = require('fs-extra');
const path = require('path');

const outputDir = path.join(process.cwd(), 'dist', 'cjs', 'lib');
const sourceDir = path.join(process.cwd(), 'lib');

// Create output directory
fs.ensureDirSync(outputDir);

// Convert convert.js
const convertSource = fs.readFileSync(path.join(sourceDir, 'convert.js'), 'utf8');
const convertCjs = convertSource
    .replace(/import oniOcfl from 'oni-ocfl';\nimport escape from 'regexp.escape';\n\nconst { Collector, generateArcpId } = oniOcfl;/g, 
             "const oniOcfl = require('oni-ocfl');\nconst { Collector, generateArcpId } = oniOcfl;\nconst escape = require('regexp.escape');")
    .replace(/export {\s*convertRoCrateToOcfl\s*};/g,
             "module.exports = { convertRoCrateToOcfl };");

fs.writeFileSync(path.join(outputDir, 'convert.cjs'), convertCjs);

// Convert index.js
const indexSource = fs.readFileSync(path.join(sourceDir, 'index.js'), 'utf8');
const indexCjs = indexSource
    .replace(/export { convertRoCrateToOcfl } from '\.\/convert\.js';/g,
             "const { convertRoCrateToOcfl } = require('./convert.cjs');\nmodule.exports = { convertRoCrateToOcfl };");

fs.writeFileSync(path.join(outputDir, 'index.cjs'), indexCjs);

console.log('✓ CommonJS build complete');
console.log(`  Generated: ${path.join(outputDir, 'index.cjs')}`);
console.log(`  Generated: ${path.join(outputDir, 'convert.cjs')}`);
