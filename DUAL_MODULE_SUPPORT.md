# Dual Module Support: import & require

**Yes! `corpus-tools-ro-crate` now supports both `import` (ESM) and `require` (CommonJS).**

## How It Works

The library provides dual package exports:

```json
"exports": {
  ".": {
    "import": "./lib/index.js",
    "require": "./dist/cjs/lib/index.cjs"
  }
}
```

- **ESM users** (Node 12+): Get `/lib/index.js` (native ES modules)
- **CommonJS users**: Get `/dist/cjs/lib/index.cjs` (transpiled)

## Usage: ESM (import)

```javascript
// Using import syntax
import { convertRoCrateToOcfl } from 'corpus-tools-ro-crate';

const result = await convertRoCrateToOcfl({
    repoPath: '/output/ocfl-repo',
    dataDir: '/input/ro-crate',
    namespace: 'my-corpus'
});
```

**File extension**: `.mjs` or `.js` (with `"type": "module"` in package.json)

## Usage: CommonJS (require)

```javascript
// Using require syntax
const { convertRoCrateToOcfl } = require('corpus-tools-ro-crate');

(async () => {
    const result = await convertRoCrateToOcfl({
        repoPath: '/output/ocfl-repo',
        dataDir: '/input/ro-crate',
        namespace: 'my-corpus'
    });
})();
```

**File extension**: `.js` or `.cjs` (default CommonJS)

## Build Setup

### Initial Build
When you first clone/install, generate the CommonJS build:

```bash
npm run build:cjs
```

This creates:
- `dist/cjs/lib/index.cjs`
- `dist/cjs/lib/convert.cjs`

### During Development
If you modify source files (`lib/convert.js` or `lib/index.js`), rebuild:

```bash
npm run build:cjs
```

## File Structure

```
corpus-tools-ro-crate/
├── lib/                          ← ESM source
│   ├── index.js                  ← ESM export
│   └── convert.js                ← ESM implementation
├── dist/cjs/lib/                 ← Generated CommonJS
│   ├── index.cjs                 ← CommonJS export
│   └── convert.cjs               ← CommonJS implementation
├── scripts/
│   └── build-cjs.cjs             ← Build script (CommonJS generator)
└── package.json
```

## Testing

Verify both work locally:

```bash
# Test ESM
node test-import.mjs

# Test CommonJS  
node test-require.cjs
```

Expected output:
```
✓ ESM import successful!
  Function imported: function
  Function name: convertRoCrateToOcfl

✓ CommonJS require successful!
  Function required: function
  Function name: convertRoCrateToOcfl
```

## Which One Should I Use?

| Use Case | Recommendation |
|----------|-----------------|
| Modern Node.js 14+ | `import` (ESM) |
| Older Node.js | `require` (CommonJS) |
| TypeScript | Both work (use `esModuleInterop`) |
| Browser bundler (Webpack, Vite) | `import` (ESM) |
| Legacy project | `require` (CommonJS) |

## Troubleshooting

### Error: "Cannot find module 'corpus-tools-ro-crate'"

**CommonJS**: Make sure CommonJS build exists:
```bash
npm run build:cjs
```

**ESM**: Check `import` path - it should match the package name exactly:
```javascript
import { convertRoCrateToOcfl } from 'corpus-tools-ro-crate';  ✓
import { convertRoCrateToOcfl } from './lib/index.js';        ✓ (local)
```

### Error: "ESM module not found"

ESM import failing? Check:
1. Node.js version (need 12.20+)
2. `package.json` has `"type": "module"` (for `.js` files)
3. Or use `.mjs` extension

### Error: "CommonJS module not found"

CommonJS require failing? Check:
1. Built CommonJS files exist:
   ```bash
   ls dist/cjs/lib/
   ```
2. If missing, rebuild:
   ```bash
   npm run build:cjs
   ```

## Publishing to npm

When ready to publish:

1. **Build before publishing**:
   ```bash
   npm run build:cjs
   ```

2. **Add dist/ to .npmignore or let npm include it** (it's not in `.gitignore`)

3. **Publish**:
   ```bash
   npm publish
   ```

Users will automatically get:
- ESM version if they support it
- CommonJS version otherwise

## Advanced: TypeScript Support

### Using with TypeScript + ESM

```typescript
import { convertRoCrateToOcfl } from 'corpus-tools-ro-crate';

async function processCorpus() {
    const result = await convertRoCrateToOcfl({
        repoPath: '/output',
        dataDir: '/input',
        namespace: 'corpus'
    });
}
```

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "module": "esnext",
    "target": "es2020",
    "moduleResolution": "node"
  }
}
```

### Using with TypeScript + CommonJS

```typescript
import { convertRoCrateToOcfl } = require('corpus-tools-ro-crate');

async function processCorpus() {
    const result = await convertRoCrateToOcfl({
        repoPath: '/output',
        dataDir: '/input',
        namespace: 'corpus'
    });
}
```

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "es2020",
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

## Why Dual Support?

- **Maximum compatibility** — Works in any Node.js project
- **Zero breaking changes** — Existing CommonJS code still works
- **Future-proof** — ESM is the official standard
- **Seamless** — Users don't need to configure anything

## See Also

- [Node.js ESM Documentation](https://nodejs.org/api/esm.html)
- [Package Exports Guide](https://nodejs.org/api/packages.html#packages_exports)
- [CommonJS to ESM Migration](https://nodejs.org/api/esm.html#esm_differences_from_commonjs)
