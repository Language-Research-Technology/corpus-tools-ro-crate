# corpus-tools-ro-crate

Prepare a corpus for publication or use in [Oni](https://github.com/Language-Research-Technology/oni) by generating the OCFL object contained in a root OCFL storage with a specific layout.

This tool requires an input of an RO-Crate directory containing all the required data:
- `ro-crate-metadata.json` metadata file as per the [specification](https://www.researchobject.org/ro-crate/specification)
- any other files referenced in the metadata (e.g. data files)

The package can be used both as:
- a CLI tool
- an importable Node.js library

## Install

### Local development

Clone the repo then install:

```
npm install
```

### Global CLI install

```bash
npm install -g github:Language-Research-Technology/corpus-tools-ro-crate
```

### Library dependency install

```bash
npm install github:Language-Research-Technology/corpus-tools-ro-crate
```

## Quick Start

### CLI quick start

```bash
corpus-tools-ro-crate -r /output/ocfl-repo -d /input/ro-crate -s my-corpus
```

### Library quick start (ESM)

```javascript
import { convertRoCrateToOcfl } from 'corpus-tools-ro-crate';

const result = await convertRoCrateToOcfl({
	repoPath: '/output/ocfl-repo',
	dataDir: '/input/ro-crate',
	namespace: 'my-corpus'
});

console.log(result.mode); // bundled
```

### Library quick start (CommonJS)

```javascript
const { convertRoCrateToOcfl } = require('corpus-tools-ro-crate');

async function main() {
	const result = await convertRoCrateToOcfl({
		repoPath: '/output/ocfl-repo',
		dataDir: '/input/ro-crate',
		namespace: 'my-corpus'
	});

	console.log(result.mode); // bundled
}

main();
```

## CLI Usage

Either set the environment variable as described below or replace it with the proper value.

```bash
node index.js \
	-r "${REPO_OUT_DIR}" \
	-d "${DATA_DIR}" \
	-s "${NAMESPACE}" \
	--distributed \
	--sf \
 	--vm "${MODEFILE}"
```

Or with installed CLI:

```bash
corpus-tools-ro-crate \
	--repo "${REPO_OUT_DIR}" \
	--dataDir "${DATA_DIR}" \
	--namespace "${NAMESPACE}" \
	--distributed \
	--sf \
	--validationProfile "${MODEFILE}"
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

### -r "${REPO_OUT_DIR}"
Specify the output directory `${REPO_OUT_DIR}`, which is the path to the OCFL repository or storage root.

### -d "${DATA_DIR}"
Specify the input directory `${DATA_DIR}`, which is the path to the RO-Crate directory containing the `ro-crate-metadata.json` file and the data files.

### -s "${NAMESPACE}"
`${NAMESPACE}` is a name for the top-level collection which must be unique to the repository. This is used to create an ARCP identifier `arcp://name,<namespace>` to make the `@id` of the Root Data Entity into a valid absolute IRI.

### --distributed

If `--distributed` is specified, a distributed crate will be created. The input crate will be split to output multiple crates. Each RepositoryObject and RepositoryCollection in the input crate will be put into each own OCFL storage object.

### --sf
Using `--sf` flag requires [Siegfried](https://github.com/richardlehane/siegfried) to be installed. It will run it and cache the output to `.siegfried.json`.
Delete file `.siegfried.json` to force it to rerun Siegfried.

### --vm
Using the `--vm "${MODEFILE}"` argument will enable validation against the mode file `${MODEFILE}` which can be a file path or a URL.

## Library Usage

### API

```javascript
const result = await convertRoCrateToOcfl(options);
```

### Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `repoPath` | string | yes | Output OCFL repository root directory |
| `dataDir` | string | yes | Input RO-Crate directory containing `ro-crate-metadata.json` |
| `namespace` | string | yes | Unique namespace for ARCP IRI (`arcp://name,<namespace>`) |
| `distributed` | boolean | no | Create distributed OCFL objects instead of bundled (default: `false`) |
| `runSiegfried` | boolean | no | Run Siegfried for file format identification (default: `false`) |
| `templateCrateDir` | string | no | Template crate directory for new object creation |
| `validationProfile` | string | no | Validation profile URL or file path |

### Return value

```javascript
{
	collector,     // oni-ocfl Collector instance
	repoPath,      // output repository path
	namespace,     // used namespace
	mode           // 'bundled' | 'distributed'
}
```

### Library examples

#### Bundled conversion

```javascript
import { convertRoCrateToOcfl } from 'corpus-tools-ro-crate';

await convertRoCrateToOcfl({
	repoPath: './ocfl-repo',
	dataDir: './my-corpus-rocrate',
	namespace: 'my-corpus'
});
```

#### Distributed conversion with Siegfried

```javascript
import { convertRoCrateToOcfl } from 'corpus-tools-ro-crate';

const result = await convertRoCrateToOcfl({
	repoPath: '/data/ocfl-repository',
	dataDir: '/data/input/sydney-speaks',
	namespace: 'sydney-speaks',
	distributed: true,
	runSiegfried: true
});

console.log(`Converted to ${result.mode} mode`);
```

#### Batch processing multiple corpora

```javascript
import { convertRoCrateToOcfl } from 'corpus-tools-ro-crate';

const corpora = [
	{ name: 'corpus-a', inputDir: '/data/corpus-a' },
	{ name: 'corpus-b', inputDir: '/data/corpus-b' },
	{ name: 'corpus-c', inputDir: '/data/corpus-c' }
];

const repoRoot = '/data/ocfl-repository';

for (const corpus of corpora) {
	try {
		await convertRoCrateToOcfl({
			repoPath: repoRoot,
			dataDir: corpus.inputDir,
			namespace: corpus.name,
			distributed: true
		});
		console.log(`OK: ${corpus.name}`);
	} catch (error) {
		console.error(`FAILED: ${corpus.name}: ${error.message}`);
	}
}
```

## Error Handling

```javascript
import { convertRoCrateToOcfl } from 'corpus-tools-ro-crate';

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

## Output
The directory `${REPO_OUT_DIR}` will be created, which will contain all the OCFL objects. If a distributed crate is created, the OCFL storage layout will look something like this:
```text
- arcp://name,<${NAMESPACE}>
  - __object__
  - collection1
    - __object__
    - object1
    - object2
```

## Notes

- If using `--sf` or `runSiegfried: true`, install [Siegfried](https://github.com/richardlehane/siegfried) first.
- Siegfried output is cached in `.siegfried.json`; delete this file to force re-run.
- `namespace` values should be unique per OCFL repository.
- Existing CLI workflows continue to work unchanged while library usage is available.
