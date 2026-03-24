#!/usr/bin/env node

/*
This is part of the Language Data Commons tools

(c) The University of Queensland 2025

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import { convertRoCrateToOcfl } from './lib/index.js';

/**
 * CLI entry point - parses arguments and calls the library
 */
async function cli() {
    const yargs = (await import('yargs')).default;
    
    const argv = yargs
        .option('r', {
            alias: 'repo',
            describe: 'Output OCFL repository path',
            type: 'string'
        })
        .option('d', {
            alias: 'dataDir',
            describe: 'Input RO-Crate directory containing ro-crate-metadata.json',
            type: 'string'
        })
        .option('s', {
            alias: 'namespace',
            describe: 'Namespace for ARCP IRI (must be unique per repository)',
            type: 'string'
        })
        .option('distributed', {
            describe: 'Create distributed OCFL objects (split collections/objects)',
            type: 'boolean',
            default: false
        })
        .option('sf', {
            describe: 'Run Siegfried for file format identification (requires Siegfried CLI)',
            type: 'boolean',
            default: false
        })
        .option('vm', {
            alias: 'validationProfile',
            describe: 'Validation profile URL or file path',
            type: 'string'
        })
        .option('t', {
            alias: 'template',
            describe: 'Template crate directory',
            type: 'string'
        })
        .demandOption(['r', 'd', 's'], 'Please provide repo path (-r), data directory (-d), and namespace (-s)')
        .help()
        .argv;

    try {
        const result = await convertRoCrateToOcfl({
            repoPath: argv.r,
            dataDir: argv.d,
            namespace: argv.s,
            distributed: argv.distributed,
            runSiegfried: argv.sf,
            validationProfile: argv.vm,
            templateCrateDir: argv.t
        });

        console.log(`\n✓ Conversion complete!`);
        console.log(`  Repository: ${result.repoPath}`);
        console.log(`  Namespace: ${result.namespace}`);
        console.log(`  Mode: ${result.mode}`);
        process.exit(0);
    } catch (error) {
        console.error(`\n✗ Conversion failed:`);
        console.error(error.message);
        process.exit(1);
    }
}

// Run CLI if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
    cli();
}

export { cli };
