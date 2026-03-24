# Architecture: Library + CLI Design

## Overview

This project is now structured as a **reusable library** with an optional **CLI wrapper**. This separation provides maximum flexibility.

```
┌─────────────────────────────────────────────────┐
│         CLI User (CLI Entry Point)              │
│         $ corpus-tools-ro-crate [options]       │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│      index.js (CLI Wrapper)                     │
│  • Parses command-line arguments with yargs     │
│  • Validates input parameters                   │
│  • Calls library function                       │
│  • Reports results/errors                       │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│      lib/index.js (Library Export)              │
│  • Main entry point for library users           │
│  • Re-exports convertRoCrateToOcfl()            │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│    lib/convert.js (Core Logic)                  │
│  • convertRoCrateToOcfl(options)                │
│  • convertDistributed(...)                      │
│  • All processing algorithms                    │
│  • Error handling                               │
└─────────────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
    ┌────────┐  ┌────────┐  ┌────────┐
    │ oni-ocfl
    │        │  │ ldac-  │  │ fs-    │
    │        │  │profile │  │extra   │
    └────────┘  └────────┘  └────────┘
```

## Module Responsibilities

### CLI Entry Point: `index.js`

**Purpose**: Command-line interface

**Responsibilities**:
- Parse CLI arguments using `yargs`
- Validate required parameters
- Convert CLI flags to library options
- Handle success/error output
- Exit with appropriate codes

**API**:
```javascript
cli()  // Runs only when called as main module
```

### Library Export: `lib/index.js`

**Purpose**: Public API entry point

**Responsibilities**:
- Minimal file - just imports/exports
- Re-exports core functions
- Serves as the module entry point (defined in package.json `"main"`)

**API**:
```javascript
module.exports = {
    convertRoCrateToOcfl
}
```

### Core Logic: `lib/convert.js`

**Purpose**: All conversion algorithms

**Responsibilities**:
export { convertRoCrateToOcfl } from './convert.js';
- Entity externalization (BFS queue)
- ID generation and normalization
- Property mapping and inheritance
- Date normalization
- Error validation

**Key Functions**:
- `convertRoCrateToOcfl(options)` - Main public function
- `convertDistributed(...)` - Distributed mode algorithm (private)
- `copyEntity(...)` - Recursive entity copying (private)

**Input Options**:
```javascript
{
    repoPath: string,              // Required
    dataDir: string,               // Required
    namespace: string,             // Required
    distributed?: boolean,         // Optional
    runSiegfried?: boolean,        // Optional
    templateCrateDir?: string,     // Optional
    validationProfile?: string     // Optional
}
```

**Output**:
```javascript
{
    collector: Collector,
    repoPath: string,
    namespace: string,
    mode: 'bundled' | 'distributed'
}
```

## Data Flow

### Bundled Mode (Simple)
```
Input RO-Crate
    │
    ▼
Create Collector
    │
    ▼
Load Crate Metadata
    │
    ▼
Create Single OCFL Object
    │
    ▼
Add to Repository
    │
    ▼
Output OCFL Repository
```

### Distributed Mode (Complex)
```
Input RO-Crate
    │
    ▼
Create Collector
    │
    ▼
Load Crate Metadata
    │
    ▼
BFS Traversal (Build Entity Map)
    │
    ├─ Extract RepositoryCollections
    │
    ├─ Extract RepositoryObjects
    │
    └─ Establish parent-child relationships
           │
           ▼
    For Each Externalized Entity:
           │
           ├─ Create OCFL Object
           │
           ├─ Generate ARCP IRI
           │
           ├─ Copy entity properties
           │
           ├─ Add metadata profiles
           │
           └─ Add to repository
                    │
                    ▼
              Output OCFL Repository
```

## Key Concepts

### 1. **Externalization (Distributed Mode)**
- Entities are "externalized" into a Map
- Preserves parent-child hierarchy via `pcdm:memberOf`
- Uses BFS (queue-based) traversal for consistent ordering
- Avoids cyclic references

### 2. **ID Generation**
- Fragment IDs (`#name`) → ARCP IRIs (`arcp://name,...`)
- Ensures absolute URI compliance
- Hierarchy encoded in path construction

### 3. **Property Inheritance**
- Mandatory properties: `dct:rightsHolder`, `author`, `accountablePerson`, `publisher`
- Inherited from parent if missing in child
- Applied to each OCFL object's root

### 4. **Metadata Profiles**
- Each object gets LDAC profile link
- Based on entity type: `RepositoryCollection` or `RepositoryObject`
- Profiles: `https://w3id.org/ldac/profile#Collection` or `#Object`

### 5. **File Handling**
- Files in `hasPart` arrays
- Optional Siegfried integration for format identification
- Format: dual encoding (human + PRONOM URI)
- Cached in `.siegfried.json`

## Usage Patterns

### Pattern 1: Direct Import (Library User)
```javascript
const { convertRoCrateToOcfl } = require('corpus-tools-ro-crate');
await convertRoCrateToOcfl({ ... });
```

### Pattern 2: CLI (Command Line User)
```bash
node index.js -r /repo -d /data -s namespace --distributed
```

### Pattern 3: Express Middleware
```javascript
app.post('/convert', async (req, res) => {
    const result = await convertRoCrateToOcfl(req.body);
    res.json(result);
});
```

### Pattern 4: Batch Processing
```javascript
for (const corpus of corpora) {
    await convertRoCrateToOcfl({
        repoPath: '/shared/repo',
        dataDir: corpus.path,
        namespace: corpus.name
    });
}
```

## Error Handling

### Validation Layer (lib/convert.js)
```javascript
if (!repoPath) throw new Error('repoPath is required');
if (!dataDir) throw new Error('dataDir is required');
if (!namespace) throw new Error('namespace is required');
```

### User-Facing Errors (index.js CLI)
```javascript
try {
    await convertRoCrateToOcfl(...);
} catch (error) {
    console.error('✗ Conversion failed:');
    console.error(error.message);
    process.exit(1);
}
```

## Dependencies

### Direct Dependencies
- **oni-ocfl**: OCFL object/storage management
- **language-data-commons-vocabs**: LDAC profile URIs
- **ldac-profile**: Profile definitions
- **fs-extra**: File system utilities
- **regexp.escape**: Safe regex pattern construction
- **yargs**: CLI argument parsing

### External Tools
- **Siegfried**: File format identification (optional, CLI only)
- **Austlang API**: Language metadata enrichment (optional)

## Performance Characteristics

| Mode | Objects Created | Speed | Use Case |
|------|-----------------|-------|----------|
| **Bundled** | 1 | Fast | Single corpus per repo |
| **Distributed** | N (collections + objects) | Slower | Complex hierarchies, multiple items |

### Complexity
- **Bundled**: O(1) - Single OCFL object creation
- **Distributed**: O(n + m) - n entities, m relationships (BFS traversal)

## Extensibility Points

### 1. Custom Metadata Processing
Modify `copyEntity()` in `lib/convert.js` to add custom properties

### 2. Pre/Post Processing Hooks
Wrap `convertRoCrateToOcfl()` to add before/after logic

### 3. Custom Profiles
Modify `conformsTo` object for different profile URIs

### 4. Custom ID Schemes
Override `generateArcpId()` calls (from oni-ocfl)

## Testing Strategy

### Unit Tests (Future)
- Test `convertRoCrateToOcfl()` with various options
- Test error handling
- Test property mapping
- Test ID generation

### Integration Tests
- Full RO-Crate to OCFL conversion
- Distributed vs. bundled comparison
- Siegfried integration

### CLI Tests
- Argument parsing
- Exit codes
- Error messages

## Future Improvements

1. **Async File Operations**: Use Promise.all() for parallel processing
2. **Progress Reporting**: Emit events during conversion
3. **Custom Validators**: Pluggable validation framework
4. **Streaming Support**: Process large RO-Crates in chunks
5. **Rollback Capability**: Transaction-style conversions
