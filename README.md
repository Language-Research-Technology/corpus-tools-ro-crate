# corpus-tools-ro-crate

Prepare a corpus for publication or use in [Oni](https://github.com/Language-Research-Technology/oni) by generating the OCFL object contained in a root OCFL storage with a specific layout.

This tool require an input of an RO-Crate directory containing all the required data:
- `ro-crate-metadata.json` metadata file as per the [specification](https://www.researchobject.org/ro-crate/specification)
- any other files referenced in the metadata (eg data files)

## Install

Clone the repo then install:

```
npm install
```

## Usage

Either set the environment variable as described below or replace it with the proper value.

```
node index.js \
	-r "${REPO_OUT_DIR}" \
	-d "${DATA_DIR}" \
	-s "${NAMESPACE}" \
	--multiple \
	--sf \
 	--vm "${MODEFILE}"
```

### -r "${REPO_OUT_DIR}"
Specify the output directory `${REPO_OUT_DIR}`, which is the path to the OCFL repository or storage root.

### -d "${DATA_DIR}"
Specify the input directory `${DATA_DIR}`, which is the path to the RO-Crate directory containing the `ro-crate-metadata.json` file and the data files.

### -s "${NAMESPACE}"
`${NAMESPACE}` is a name for the top-level collection which must be unique to the repository. This is used to create an ARCP identifier `arcp://name,<namespace>` to make the `@id` of the Root Data Entity into a valid absolute IRI.

### --multiple

If `--multiple` is specified, a distributed crate will be created. The input crate will be split to output multiple crates. Each RepositoryObject and RepositoryCollection in the input crate will be put into each own OCFL storage object.

### --sf
Using `--sf` flag requires [Siegfried](https://github.com/richardlehane/siegfried) to be installed. It will run it and cache the output to `.siegfried.json`.
Delete file `.siegfried.json` to force it to rerun Siegfried.

### --vm
Using the `--vm "${MODEFILE}"` argument will enable validation againsts the mode file `${MODEFILE}` which can be a file path or an URL.

## Output
The directory `${REPO_OUT_DIR}` will be created which will contain all the OCFL objects. If distributed crate is created, the OCFL storage layout will look something like this:
```
- arcp://name,<${NAMESPACE}>
  - __object__
  - collection1
    -__object__
    -object1
    -object2
```
