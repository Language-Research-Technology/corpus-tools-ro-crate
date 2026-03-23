#!/usr/bin/env node

/**
 * Example: Using corpus-tools-ro-crate as a library
 * This file demonstrates common patterns for using the library in your own scripts
 */

const { convertRoCrateToOcfl } = require('./lib');
const path = require('path');
const fs = require('fs-extra');

// ============================================================================
// EXAMPLE 1: Basic Usage
// ============================================================================

async function basicExample() {
    console.log('\n--- Example 1: Basic Usage ---\n');
    
    const result = await convertRoCrateToOcfl({
        repoPath: '/tmp/ocfl-repo',
        dataDir: './test_data',
        namespace: 'example-corpus'
    });

    console.log('✓ Conversion complete!');
    console.log(`  Mode: ${result.mode}`);
}

// ============================================================================
// EXAMPLE 2: Distributed Mode with Options
// ============================================================================

async function distributedExample() {
    console.log('\n--- Example 2: Distributed Mode ---\n');
    
    const result = await convertRoCrateToOcfl({
        repoPath: '/data/ocfl-repository',
        dataDir: '/data/ro-crates/sydney-speaks',
        namespace: 'sydney-speaks',
        distributed: true,        // Split into separate OCFL objects
        runSiegfried: false,      // File format identification (needs Siegfried CLI)
    });

    console.log(`✓ ${result.mode} conversion complete`);
    console.log(`  Namespace: ${result.namespace}`);
}

// ============================================================================
// EXAMPLE 3: Batch Processing Multiple Corpora
// ============================================================================

async function batchProcessing() {
    console.log('\n--- Example 3: Batch Processing ---\n');
    
    const corpora = [
        { name: 'corpus-english', dir: '/data/corpora/english' },
        { name: 'corpus-french', dir: '/data/corpora/french' },
        { name: 'corpus-spanish', dir: '/data/corpora/spanish' }
    ];

    const repoRoot = '/data/ocfl-repository';
    const results = [];

    for (const corpus of corpora) {
        try {
            console.log(`Processing ${corpus.name}...`);
            const result = await convertRoCrateToOcfl({
                repoPath: repoRoot,
                dataDir: corpus.dir,
                namespace: corpus.name,
                distributed: true
            });
            results.push({ corpus: corpus.name, status: 'success', result });
            console.log(`✓ ${corpus.name} complete\n`);
        } catch (error) {
            results.push({ corpus: corpus.name, status: 'failed', error: error.message });
            console.error(`✗ ${corpus.name} failed: ${error.message}\n`);
        }
    }

    // Summary
    console.log('\n--- Batch Summary ---');
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;
    console.log(`Successful: ${successful}/${corpora.length}`);
    console.log(`Failed: ${failed}/${corpora.length}`);
    
    return results;
}

// ============================================================================
// EXAMPLE 4: Error Handling
// ============================================================================

async function errorHandling() {
    console.log('\n--- Example 4: Error Handling ---\n');
    
    const testCases = [
        {
            name: 'Missing repoPath',
            options: { dataDir: '/data', namespace: 'test' }
        },
        {
            name: 'Missing dataDir',
            options: { repoPath: '/repo', namespace: 'test' }
        },
        {
            name: 'Missing namespace',
            options: { repoPath: '/repo', dataDir: '/data' }
        }
    ];

    for (const testCase of testCases) {
        console.log(`Testing: ${testCase.name}`);
        try {
            await convertRoCrateToOcfl(testCase.options);
        } catch (error) {
            console.log(`  ✓ Caught error: ${error.message}\n`);
        }
    }
}

// ============================================================================
// EXAMPLE 5: With Callback/Promise Chaining
// ============================================================================

async function promiseChaining() {
    console.log('\n--- Example 5: Promise Chaining ---\n');
    
    const conversionPromises = [
        { namespace: 'corpus-1', dataDir: '/data/corpus-1' },
        { namespace: 'corpus-2', dataDir: '/data/corpus-2' },
        { namespace: 'corpus-3', dataDir: '/data/corpus-3' }
    ].map(corpus => 
        convertRoCrateToOcfl({
            repoPath: '/data/ocfl-repository',
            dataDir: corpus.dataDir,
            namespace: corpus.namespace,
            distributed: true
        }).then(result => ({
            namespace: corpus.namespace,
            status: 'success',
            result
        })).catch(error => ({
            namespace: corpus.namespace,
            status: 'failed',
            error: error.message
        }))
    );

    const results = await Promise.all(conversionPromises);
    console.log('Results:', JSON.stringify(results, null, 2));
}

// ============================================================================
// EXAMPLE 6: Configuration-Driven Processing
// ============================================================================

async function configurationDriven() {
    console.log('\n--- Example 6: Configuration-Driven ---\n');
    
    // Load configuration from JSON file
    const config = {
        repositories: [
            {
                name: 'sydney-speaks',
                dataDir: '/data/sydney-speaks',
                namespace: 'sydney-speaks',
                options: { distributed: true, runSiegfried: false }
            },
            {
                name: 'arrernte',
                dataDir: '/data/arrernte',
                namespace: 'arrernte',
                options: { distributed: true, runSiegfried: false }
            }
        ],
        outputRepo: '/data/ocfl-repository'
    };

    for (const repo of config.repositories) {
        try {
            console.log(`Converting ${repo.name}...`);
            const result = await convertRoCrateToOcfl({
                repoPath: config.outputRepo,
                dataDir: repo.dataDir,
                namespace: repo.namespace,
                ...repo.options
            });
            console.log(`✓ ${repo.name}: ${result.mode} mode\n`);
        } catch (error) {
            console.error(`✗ ${repo.name}: ${error.message}\n`);
        }
    }
}

// ============================================================================
// EXAMPLE 7: Integration with Express.js
// ============================================================================

function expressIntegration() {
    console.log('\n--- Example 7: Express.js Integration ---\n');
    
    // This is a conceptual example (requires npm install express)
    const expressExample = `
    const express = require('express');
    const { convertRoCrateToOcfl } = require('corpus-tools-ro-crate');

    const app = express();
    app.use(express.json());

    app.post('/api/convert', async (req, res) => {
        const { repoPath, dataDir, namespace, distributed } = req.body;
        
        try {
            const result = await convertRoCrateToOcfl({
                repoPath,
                dataDir,
                namespace,
                distributed: distributed || false
            });
            
            res.json({
                success: true,
                message: 'Conversion completed',
                result
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    });

    app.listen(3000, () => console.log('API running on http://localhost:3000'));
    `;
    
    console.log(expressExample);
}

// ============================================================================
// EXAMPLE 8: File System Monitoring
// ============================================================================

function fsMonitoring() {
    console.log('\n--- Example 8: File System Monitoring ---\n');
    
    const example = `
    const fs = require('fs');
    const path = require('path');
    const { convertRoCrateToOcfl } = require('corpus-tools-ro-crate');

    const watchDir = '/data/incoming-ro-crates';
    const outputRepo = '/data/ocfl-repository';

    fs.watch(watchDir, async (eventType, filename) => {
        if (eventType === 'rename' && filename.endsWith('.json')) {
            console.log(\`New RO-Crate detected: \${filename}\`);
            
            const namespace = path.basename(filename, '.json');
            const dataDir = path.join(watchDir, namespace);
            
            try {
                await convertRoCrateToOcfl({
                    repoPath: outputRepo,
                    dataDir,
                    namespace,
                    distributed: true
                });
                console.log(\`✓ Processed \${namespace}\`);
            } catch (error) {
                console.error(\`✗ Failed to process \${namespace}: \${error.message}\`);
            }
        }
    });
    `;
    
    console.log(example);
}

// ============================================================================
// MAIN: Run Examples
// ============================================================================

async function runExamples() {
    console.log('════════════════════════════════════════════════════════════════');
    console.log('  corpus-tools-ro-crate Library Examples');
    console.log('════════════════════════════════════════════════════════════════');

    try {
        // Uncomment examples to run:
        
        // await basicExample();
        // await distributedExample();
        // await batchProcessing();
        await errorHandling();
        // await promiseChaining();
        // await configurationDriven();
        
        expressIntegration();
        fsMonitoring();

        console.log('\n════════════════════════════════════════════════════════════════');
        console.log('See LIBRARY.md for more detailed documentation');
        console.log('════════════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('Error running examples:', error);
    }
}

// Run if called directly
if (require.main === module) {
    runExamples();
}

module.exports = {
    basicExample,
    distributedExample,
    batchProcessing,
    errorHandling,
    promiseChaining,
    configurationDriven
};
