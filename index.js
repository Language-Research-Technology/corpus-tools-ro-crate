#!/usr/bin/env node

/*
This is part of the Lanaguge Data Commons tools

(c) The University of Queensland 2023

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

const fs = require('fs-extra');
const { Collector, generateArcpId } = require('oni-ocfl');
const { DataPack } = require('@ldac/data-packs');
const { LdacProfile } = require('ldac-profile');

const { languageProfileURI, Vocab } = require("language-data-commons-vocabs");
const { getLanguagePack, loadSiegfried, search } = require("./src/helpers")
const { storeObject, storeCollection } = require("./src/items")

const shell = require("shelljs");
const path = require('path');

const { first } = require('lodash');

const PRONOM_URI_BASE = 'https://www.nationalarchives.gov.uk/PRONOM/';

let reRunSiegfied = true; // TODO: put in config
let collections = fs.readJSONSync("collections.json");

async function main() {
    const vocab = new Vocab;
    await vocab.load();

    const languageEntity = await search({ query: 'stan1293', fields: "languageCode" });
    for (let collection of Object.keys(collections)) {
        const collStore = collections[collection];
        const collector = new Collector();
        collector.dataDir = collStore.path;

        const siegfriedFilePath = path.join(collector.dataDir, "siegfriedOutput.json");
        reRunSiegfied = collStore.reRunSiegfied;
        let siegfriedData = loadSiegfried(collector, reRunSiegfied, siegfriedFilePath);

        await collector.connect(); // Make or find the OCFL repo
        // Get a new crate

        // This is the main crate - TODO: actually have some data in the template collector.templateCrateDir and add it below.
        const corpus = collector.newObject(collector.dataDir);

        const corpusCrate = corpus.crate;

        //corpusCrate.addContext(vocab.getContext());
        const corpusRoot = corpus.rootDataset;
        corpusRoot.inLanguage = corpusRoot.inLanguage || corpusRoot.language || languageEntity[0];
        corpusCrate.addProfile(languageProfileURI('Collection'));
        corpusRoot['@type'] = ['Dataset', 'RepositoryCollection'];
        console.log(corpusRoot["@id"]);
        let languages = [];
        if (Array.isArray(corpusRoot.inLanguage)) {
            for (let l of corpusRoot.inLanguage) {
                if (!l["@id"]) {
                    let language = await search({ query: corpusRoot.inLanguage[0], fields: "name" });
                    languages.push(language[0]);
                } else {
                    languages.push(l)
                }
            }
        } else {

        }
        if (!corpusRoot.inLanguage[0]["@id"]) {
            console.log("No Language Code")
            let language = await search({ query: corpusRoot.inLanguage[0], fields: "name" });
            console.log(language[0])
        }

        if (collStore.subCollections) {
            console.log(collStore)
            let filesDealtWith = {};
            let itemsDealtWith = [];
            Object.keys(collStore.subCollections).forEach((key)=>{
                const topLevelObject = collector.newObject(collStore.subCollections[key].path)
                console.log(collStore.subCollections[key].path)
            });
            
            process.exit()
            await collector.connect()
            const topLevelObject = collector.newObject(); // Main collection
            topLevelObject.crate.addProfile(languageProfileURI('Collection'));
            topLevelObject.mintArcpId();

            for (let item of corpusCrate.getGraph()) {
                let languages = [];
                if (item["@type"].includes("RepositoryCollection")) {
                    if ((item['@reverse'] && item['@reverse'].about && item['@reverse'].about.find(i => i['@id'] === 'ro-crate-metadata.json'))) {
                        console.log('Do not store already handled');
                    } else {
                        await storeCollection(collector, item, topLevelObject.id, filesDealtWith, siegfriedData, false, itemsDealtWith);
                    }
                } else if (item["@type"].includes("RepositoryObject")) {
                    // TODO: stop if it has already been processed by a sub-collection
                    let memberOfId;
                    if (item["memberOf"]) {
                        const memberOf = first(item["memberOf"]);
                        memberOfId = memberOf?.['@id'];
                        console.log(memberOfId)
                        await storeObject(collector, item, topLevelObject, filesDealtWith, siegfriedData, true, itemsDealtWith);
                    }
                }
            }

            // Copy pros from the template object to our new top level
            for (let prop of Object.keys(corpusRoot)) {
                if (prop === "hasPart") {

                } else if (prop === "hasMember") {
                    console.log("Dealing with members")
                    // TODO: Make sure each member knows its a memberOf (in the case where hasMember has been specified at the top level)
                } else {
                    topLevelObject.crate.rootDataset[prop] = corpusRoot[prop];
                }
            }
            topLevelObject.crate.rootDataset["@id"] = topLevelObject.id;
            console.log("Top Level Root Dataset", topLevelObject.crate.rootDataset["@id"]);

            // Top Level Files
            for (let item of corpusCrate.getGraph()) {
                if (item["@type"].includes("File") && !filesDealtWith[item["@id"]]) {
                    await topLevelObject.addFile(item, collector.templateCrateDir)
                }

            }
            await topLevelObject.addToRepo();
        }
    }

    if (reRunSiegfied) {
        console.log(`Writing Siegfried file data to ${siegfriedFilePath}`);
        fs.writeFileSync(siegfriedFilePath, JSON.stringify(siegfriedData));
    }
}


main()
