# Copilot Instructions for corpus-tools-ro-crate

## Project Overview

**Purpose**: Converts RO-Crate (Research Object Crate) metadata structures to OCFL (Oxford Common File Layout) objects for corpus publication and archival.

**Core Abstraction**: 
- Input: RO-Crate directory with `ro-crate-metadata.json` + data files
- Processing: Maps RO-Crate entities (`RepositoryCollection`, `RepositoryObject`) to hierarchical OCFL storage objects
- Output: OCFL-compliant repository structure with metadata profiles

## Architecture

### Entry Point & CLI Flow

[index.js](index.js) is the executable entry point. Key operations:
1. **Collector initialization**: Creates `oni-ocfl` Collector from command-line options (`-r`, `-d`, `-s`, etc.)
2. **RO-Crate parsing**: Loads input crate metadata and establishes root entity
3. **Entity traversal**: Two modes—**bundled** (single OCFL object) or **distributed** (multiple OCFL objects via `--distributed` flag)
4. **Profile application**: Adds LDAC profiles (`language-data-commons-vocabs`) to each object
5. **Repository write**: Persists all objects to OCFL storage layout

### Key Components

- **[src/items.js](src/items.js)**: Entity storage logic
  - `storeCollection()`: Recursively processes `RepositoryCollection` entities and their hierarchy
  - `storeObject()`: Handles individual `RepositoryObject` entities
  - Pattern: Reads `hasPart`/`hasMember` relationships, extracts files, applies LDAC metadata profiles
  
- **[src/helpers.js](src/helpers.js)**: Utility functions
  - `loadSiegfried()` / `readSiegfried()`: File format identification via Siegfried CLI (PRONOM format URIs)
  - `getAustlangData()`: External API integration to Austlang for language metadata enrichment

### Critical Data Flows

1. **Hierarchy Encoding (Distributed Mode)**
   - BFS queue traversal builds `pcdm:memberOf` relationships
   - Externalized entities stored in Map to preserve parent-child links
   - `generateArcpId()` creates IRIs from parent hierarchy paths (replaces `#`-style fragment IDs)

2. **Entity Property Mapping**
   - Collections maintain `@type` (includes `RepositoryCollection`, `Dataset`)
   - Objects include `conformsTo` links to LDAC profiles
   - Mandatory root properties (`dct:rightsHolder`, `author`, `publisher`) inherited from parent if missing
   - Date normalization ensures ISO 8601 format (yyyy-MM-dd)

3. **File Handling**
   - `hasPart` arrays contain File entities with `encodingFormat` (optional dual format: human-readable + PRONOM URI)
   - Siegfried run caches in `.siegfried.json` (delete to rerun)
   - Files added via `itemCollection.addFile()`

## Build, Testing & Library Usage

### Commands

- **Installation**: `npm install` installs dependencies (fs-extra, oni-ocfl, ldac-profile, yargs, etc.)
- **CLI Running**: `node index.js [options]` with flags like `-r`, `-d`, `-s`, `--distributed`, `--sf`, `--vm`
- **Makefile Usage**: `make repo` builds with defaults from [Makefile](Makefile); override `BASE_DATA_DIR`, `REPO_OUT_DIR`, `NAMESPACE`
- **Bash runners**: [make_run.sh](make_run.sh), [make_run_ss_root.sh](make_run_ss_root.sh) etc. are corpus-specific wrappers

### Library Usage

- **Entry point**: [lib/index.js](lib/index.js) exports `convertRoCrateToOcfl(options)` function
- **Core logic**: [lib/convert.js](lib/convert.js) contains the main conversion algorithm
- **Import in other scripts**: `const { convertRoCrateToOcfl } = require('corpus-tools-ro-crate');`
- **See [LIBRARY.md](LIBRARY.md)** for complete usage guide, examples, and error handling

### Testing

- Framework: Mocha (installed as devDependency)
- Test file: [test/collection-subcollections.spec.js](test/collection-subcollections.spec.js)
- Pattern: Uses `beforeAll()` hooks, `Collector` initialization, `assert` assertions
- Run tests: `npm test` (currently placeholder—expand test suite for new features)
- Recommended: Add tests for library API in addition to CLI integration tests

## Project-Specific Patterns

### Error Handling

- Early exit on critical failures (e.g., Siegfried not installed, Austlang API failures)
- File existence checks before processing: `fs.existsSync(path.join(dataDir, fileID))`
- Shell execution errors logged with context (Siegfried example in helpers.js)

### ID Generation

- Fragment IDs (`#name`) replaced with ARCP IRIs via `generateArcpId()` for absolute URI compliance
- Namespace parameter ensures unique top-level IRI (`arcp://name,<namespace>`)
- Parent-child hierarchy encoded in ARCP path construction

### External Dependencies

- **oni-ocfl** (github): Core OCFL object/storage management; provides `Collector`, `generateArcpId()`
- **language-data-commons-vocabs** (github): LDAC profile URIs; supplies `languageProfileURI()`
- **ldac-profile** (github): Profile definitions
- **Siegfried** (external CLI): File format identification; optional but recommended for `--sf` flag

## Development Notes

- **Distributed mode complexity**: The entity externalization logic (Map-based tracking, recursive `copyEntity()`) is non-obvious; document assumptions when modifying.
- **Async operations**: Crate operations are async (`await itemCollection.addToRepo()`); maintain async/await chains.
- **Regex escaping**: Uses `regexp.escape` to safely embed paths in RegExp patterns (avoid re-escaping).
- **Common typo**: Check for variable name consistency (e.g., `fileIDStore` in helpers.js may be shadowing `fileID`).

## Example Workflow

```bash
# Install
npm install

# Run with distributed crates, format identification, and validation
node index.js \
  -r /output/ocfl-repo \
  -d /input/ro-crate-directory \
  -s my-corpus \
  --distributed \
  --sf \
  --vm https://example.com/validation-profile.ttl
```

Output: Hierarchical OCFL objects under `/output/ocfl-repo/arcp://name,my-corpus/`.
