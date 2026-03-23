# Refactoring Summary: CLI to Library + CLI

## What Changed

This project was refactored from a **CLI-only tool** into a **reusable library** while maintaining full backward compatibility with the existing CLI.

### New Structure

```
corpus-tools-ro-crate/
├── lib/
│   ├── index.js           [NEW] Main export - exposes convertRoCrateToOcfl()
│   └── convert.js         [NEW] Core conversion logic
├── index.js               [CHANGED] Now a CLI wrapper using the library
├── package.json           [CHANGED] Updated with main field and yargs dependency
├── LIBRARY.md             [NEW] Complete library usage guide with examples
└── .github/
    └── copilot-instructions.md  [UPDATED] Added library usage info
```

## Key Changes

### 1. **lib/convert.js** (NEW)
- Exports `convertRoCrateToOcfl(options)` function
- Accepts standardized options object instead of CLI args
- Returns structured result with `{ collector, repoPath, namespace, mode }`
- Fully documented with JSDoc comments
- All validation happens in one place

### 2. **lib/index.js** (NEW)
- Main library entry point
- Re-exports the conversion function
- Minimal file - just imports and exports

### 3. **index.js** (CHANGED)
- Now a CLI wrapper using the library
- Parses command-line arguments with `yargs`
- Calls `convertRoCrateToOcfl()` from the library
- Better error handling and user feedback
- Maintains `#!/usr/bin/env node` shebang for CLI use

### 4. **package.json** (CHANGED)
- Added `"main": "lib/index.js"` - enables `require('corpus-tools-ro-crate')`
- Added `"yargs": "^17.7.2"` dependency for CLI argument parsing
- Added `"keywords"` for npm discoverability
- Updated description

## How to Use

### As a Library

```javascript
const { convertRoCrateToOcfl } = require('corpus-tools-ro-crate');

const result = await convertRoCrateToOcfl({
    repoPath: '/path/to/ocfl-repo',
    dataDir: '/path/to/ro-crate',
    namespace: 'my-corpus',
    distributed: true,
    runSiegfried: true
});
```

### As a CLI (unchanged)

```bash
node index.js -r /repo -d /data -s namespace --distributed --sf
```

## Benefits

✓ **Reusable**: Import into other Node.js projects  
✓ **Testable**: Library functions have clear contracts  
✓ **Maintainable**: Separation of concerns (CLI vs. logic)  
✓ **Composable**: Batch processing and integration with other tools  
✓ **Backward compatible**: Existing CLI scripts work unchanged  
✓ **npm-friendly**: Can be published and installed as a package  

## Migration Guide

### If you were using the CLI...
**Nothing changes.** Your existing commands continue to work:
```bash
node index.js -r /repo -d /data -s namespace
```

### If you want to use it as a library...
**New!** Install and import:
```bash
npm install corpus-tools-ro-crate
```

```javascript
const { convertRoCrateToOcfl } = require('corpus-tools-ro-crate');
```

See [LIBRARY.md](LIBRARY.md) for complete examples.

## Testing

- Run `npm install` to get the new `yargs` dependency
- Run `node -c index.js`, `node -c lib/index.js`, `node -c lib/convert.js` to verify syntax
- Existing Makefile commands still work
- Add tests to `test/` directory for new library functionality

## Next Steps

1. **Install dependencies**: `npm install`
2. **Test CLI**: `node index.js -r ./test-repo -d ./test-data -s test`
3. **Test library**: Create a test script that imports and uses `convertRoCrateToOcfl()`
4. **Publish to npm** (optional): `npm publish`
5. **Update documentation**: Reference `LIBRARY.md` in README.md
