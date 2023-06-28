#! /bin/bash
# MakeFile for creating sydney speaks repo
# Override BASE_DATA_DIR, REPO_OUT_DIR, BASE_TMP_DIR to point to the location of your datasets

BASE_DATA_DIR=/data
REPO_SCRATCH_DIR=scratch

REPO_OUT_DIR=./ocfl-repo
BASE_TMP_DIR=temp

REPO_NAME=LDaCA
NAMESPACE=default
CORPUS_NAME=default
XSLX=${BASE_DATA_DIR}/override
DATA_DIR=${BASE_DATA_DIR}/override
TEMP_DIR=${BASE_TMP_DIR}
TEMPLATE_DIR=./template
DEBUG=false

.DEFAULT_GOAL := repo

repo :
	node index.js -s ${NAMESPACE} \
		-t "${TEMPLATE_DIR}" \
		-c ${CORPUS_NAME} -n ${REPO_NAME} \
		-r "${REPO_OUT_DIR}" -x "${XLSX}" \
		-d "./files" \
		-D ${DEBUG} \
		-p "${TEMP_DIR}" -z "${REPO_SCRATCH_DIR}"



clean :
	rm -rf ${TEMP_DIR}
