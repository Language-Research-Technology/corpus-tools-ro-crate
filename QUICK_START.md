# Quick Start: Using corpus-tools-ro-crate as a Library

## Installation

```bash
# Install locally
npm install corpus-tools-ro-crate

# Or use in current project
npm install ./path/to/corpus-tools-ro-crate
```

## Basic Usage (30 seconds)

```javascript
const { convertRoCrateToOcfl } = require('corpus-tools-ro-crate');

// Convert an RO-Crate to OCFL format
await convertRoCrateToOcfl({
    repoPath: '/output/ocfl-repo',           // Where to save OCFL objects
    dataDir: '/input/my-ro-crate',           // Input RO-Crate directory
    namespace: 'my-corpus'                   // Unique identifier
});

console.log('✓ Conversion complete!');
```

## Common Use Cases

### 1. Simple Conversion
```javascript
const { convertRoCrateToOcfl } = require('corpus-tools-ro-crate');
await convertRoCrateToOcfl({
    repoPath: './ocfl-repo',
    dataDir: './my-corpus',
    namespace: 'my-corpus'
});
```

### 2. Distributed Mode (Multiple Objects)
```javascript
await convertRoCrateToOcfl({
    repoPath: '/repo',
    dataDir: '/data',
    namespace: 'my-corpus',
    distributed: true  // ← Split into separate OCFL objects
});
```

### 3. With File Format Detection
```javascript
await convertRoCrateToOcfl({
    repoPath: '/repo',
    dataDir: '/data',
    namespace: 'my-corpus',
    runSiegfried: true  // ← Identify file formats (requires Siegfried CLI)
});
```

### 4. Batch Processing
```javascript
const corpora = ['corpus-1', 'corpus-2', 'corpus-3'];

for (const name of corpora) {
    try {
        await convertRoCrateToOcfl({
            repoPath: '/central-repo',
            dataDir: `/data/${name}`,
            namespace: name,
            distributed: true
        });
        console.log(`✓ ${name}`);
    } catch (error) {
        console.error(`✗ ${name}: ${error.message}`);
    }
}
```

### 5. Error Handling
```javascript
try {
    await convertRoCrateToOcfl({
        repoPath: '/repo',
        dataDir: '/data',
        namespace: 'my-corpus'
    });
} catch (error) {
    if (error.message.includes('required')) {
        console.error('Missing parameter:', error.message);
    } else {
        console.error('Conversion failed:', error.message);
    }
}
```

## Available Options

| Option | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| `repoPath` | string | ✓ | - | OCFL repository root directory |
| `dataDir` | string | ✓ | - | Input RO-Crate directory path |
| `namespace` | string | ✓ | - | Must be unique per repository |
| `distributed` | boolean | | `false` | Create distributed objects |
| `runSiegfried` | boolean | | `false` | Requires Siegfried CLI installed |
| `templateCrateDir` | string | | undefined | Template for new crates |
| `validationProfile` | string | | undefined | Validation profile URL/path |

## Return Value

```javascript
{
    collector: Collector,           // oni-ocfl Collector instance
    repoPath: '/output/ocfl-repo',  // Output repository path
    namespace: 'my-corpus',         // Used namespace
    mode: 'bundled'                 // 'bundled' or 'distributed'
}
```

## File Structure

```
corpus-tools-ro-crate/
├── lib/
│   ├── index.js          ← Main export
│   └── convert.js        ← Core logic
├── index.js              ← CLI (still works!)
├── LIBRARY.md            ← Full documentation
├── REFACTORING.md        ← What changed
└── examples/
    └── library-usage.js  ← 8 detailed examples
```

## Next Steps

- **Read**: [LIBRARY.md](LIBRARY.md) for comprehensive guide
- **Examples**: Check [examples/library-usage.js](examples/library-usage.js) for 8 real-world patterns
- **CLI**: `node index.js -h` for command-line usage

## CLI Still Works!

```bash
node index.js \
  -r /output/ocfl-repo \
  -d /input/ro-crate \
  -s my-corpus \
    --distributed
```

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `repoPath is required` | Missing required option | Add `repoPath: '...'` |
| `dataDir is required` | Missing required option | Add `dataDir: '...'` |
| `namespace is required` | Missing required option | Add `namespace: '...'` |
| `ENOENT: no such file` | Directory doesn't exist | Verify path exists |
| Siegfried error | `runSiegfried: true` but not installed | Install: `brew install siegfried` |

## Support

- **Issues**: https://github.com/Language-Research-Technology/corpus-tools-ro-crate/issues
- **Docs**: See [LIBRARY.md](LIBRARY.md) for complete reference
- **Examples**: [examples/library-usage.js](examples/library-usage.js) has 8 patterns
