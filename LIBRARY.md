# Using corpus-tools-ro-crate as a Library

This package can now be used both as a CLI tool and as an importable Node.js library. Here's how to use it in your own scripts.

## Installation

### As a CLI tool
```bash
npm install -g corpus-tools-ro-crate
```

### As a library dependency
```bash
npm install corpus-tools-ro-crate
```

## Library Usage

### Basic Example

```javascript
const { convertRoCrateToOcfl } = require('corpus-tools-ro-crate');

async function main() {
    try {
        const result = await convertRoCrateToOcfl({
            repoPath: '/path/to/ocfl-repository',
            dataDir: '/path/to/ro-crate-directory',
            namespace: 'my-corpus'
        });

        console.log('Conversion complete!');
        console.log(`Repository at: ${result.repoPath}`);
        console.log(`Mode: ${result.mode}`);
    } catch (error) {
        console.error('Conversion failed:', error.message);
    }
}

main();
```

### With All Options

```javascript
const { convertRoCrateToOcfl } = require('corpus-tools-ro-crate');

const result = await convertRoCrateToOcfl({
    // Required
    repoPath: '/output/ocfl-repo',
    dataDir: '/input/ro-crate',
    namespace: 'my-corpus',
    
    // Optional
    distributed: true,           // Create distributed OCFL objects (split collections)
    runSiegfried: true,          // Enable file format identification
    templateCrateDir: '/path/to/template',  // Template for new crates
    validationProfile: 'https://example.com/profile.ttl'  // Validation profile URL or path
});
```

### Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `repoPath` | string | ✓ | Output OCFL repository root directory |
| `dataDir` | string | ✓ | Input RO-Crate directory containing `ro-crate-metadata.json` |
| `namespace` | string | ✓ | Unique namespace for ARCP IRI (`arcp://name,<namespace>`) |
| `distributed` | boolean | | Create distributed OCFL objects instead of bundled (default: `false`) |
| `runSiegfried` | boolean | | Run Siegfried for file format identification (default: `false`) |
| `templateCrateDir` | string | | Template crate directory for new object creation |
| `validationProfile` | string | | Validation profile URL or file path |

### Return Value

```javascript
{
    collector: Collector,   // oni-ocfl Collector instance
    repoPath: string,       // Output repository path
    namespace: string,      // Used namespace
    mode: 'bundled' | 'distributed'  // Conversion mode used
}
```

## CLI Usage

The CLI entry point is the same as before:

```bash
node index.js \
  -r /output/ocfl-repo \
  -d /input/ro-crate \
  -s my-corpus \
    --distributed \
  --sf
```

Or with installed CLI:

```bash
corpus-tools-ro-crate \
  --repo /output/ocfl-repo \
  --dataDir /input/ro-crate \
  --namespace my-corpus \
    --distributed \
  --sf
```

### CLI Flags

| Flag | Short | Type | Description |
|------|-------|------|-------------|
| `--repo` | `-r` | string | Output OCFL repository path (**required**) |
| `--dataDir` | `-d` | string | Input RO-Crate directory (**required**) |
| `--namespace` | `-s` | string | Unique namespace for ARCP IRI (**required**) |
| `--distributed` | | boolean | Create distributed OCFL objects |
| `--sf` | | boolean | Run Siegfried for file format identification |
| `--validationProfile` | `--vm` | string | Validation profile URL or path |
| `--template` | `-t` | string | Template crate directory |
| `--help` | `-h` | | Show help message |

## Examples

### Example 1: Simple Conversion (Bundled Mode)

```javascript
const { convertRoCrateToOcfl } = require('corpus-tools-ro-crate');

await convertRoCrateToOcfl({
    repoPath: './ocfl-repo',
    dataDir: './my-corpus-rocrate',
    namespace: 'my-corpus'
});
```

### Example 2: Distributed Mode with File Format Identification

```javascript
const { convertRoCrateToOcfl } = require('corpus-tools-ro-crate');

const result = await convertRoCrateToOcfl({
    repoPath: '/data/ocfl-repository',
    dataDir: '/data/input/sydney-speaks',
    namespace: 'sydney-speaks',
    distributed: true,
    runSiegfried: true
});

console.log(`Converted to ${result.mode} mode`);
```

### Example 3: Batch Processing Multiple Corpora

```javascript
const { convertRoCrateToOcfl } = require('corpus-tools-ro-crate');
const fs = require('fs-extra');
const path = require('path');

const corpora = [
    { name: 'corpus-a', inputDir: '/data/corpus-a' },
    { name: 'corpus-b', inputDir: '/data/corpus-b' },
    { name: 'corpus-c', inputDir: '/data/corpus-c' }
];

const repoRoot = '/data/ocfl-repository';

for (const corpus of corpora) {
    try {
        console.log(`Converting ${corpus.name}...`);
        await convertRoCrateToOcfl({
            repoPath: repoRoot,
            dataDir: corpus.inputDir,
            namespace: corpus.name,
            distributed: true
        });
        console.log(`✓ ${corpus.name} complete`);
    } catch (error) {
        console.error(`✗ ${corpus.name} failed:`, error.message);
    }
}
```

### Example 4: Integration with Express.js

```javascript
const express = require('express');
const { convertRoCrateToOcfl } = require('corpus-tools-ro-crate');

const app = express();
app.use(express.json());

app.post('/convert', async (req, res) => {
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

app.listen(3000);
```

## Error Handling

```javascript
const { convertRoCrateToOcfl } = require('corpus-tools-ro-crate');

try {
    await convertRoCrateToOcfl({
        repoPath: '/repo',
        dataDir: '/data',
        namespace: 'my-corpus'
    });
} catch (error) {
    if (error.message.includes('required')) {
        console.error('Missing required parameter:', error.message);
    } else if (error.message.includes('ENOENT')) {
        console.error('Directory not found:', error.message);
    } else {
        console.error('Conversion error:', error.message);
    }
}
```

## Notes

- **Siegfried Installation**: If using `runSiegfried: true`, ensure [Siegfried](https://github.com/richardlehane/siegfried) is installed: `brew install siegfried` or follow installation guide
- **Performance**: Distributed mode (`distributed: true`) is slower but creates individual OCFL objects per entity
- **ID Generation**: Namespaces must be unique per OCFL repository
- **Permissions**: Ensure write access to the `repoPath` directory

## Migration from CLI-Only

If you were previously using this as a CLI tool only, existing scripts will continue to work unchanged:

```bash
node index.js -r /repo -d /data -s namespace --distributed --sf
```

The library export doesn't interfere with CLI functionality.
