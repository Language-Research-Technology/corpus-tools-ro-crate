#! /bin/sh
# MakeFile for creating COOEE corpus repo
# Override BASE_DATA_DIR, REPO_OUT_DIR, BASE_TMP_DIR to point to the location of your datasets

DATA_DIR=./test_data/udhr-translations
REPO_OUT_DIR=./ocfl-repo

REPO_NAME=LDaCA
NAMESPACE=hdl10.26180~23961609

node index.js \
    -r "${REPO_OUT_DIR}" \
	-d "${DATA_DIR}" \
	-n ${REPO_NAME} \
	-s ${NAMESPACE} \
	--multiple \
	--sf \
 	--vm "./node_modules/ro-crate-modes/modes/comprehensive-ldac.json"