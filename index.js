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
const {Utils} = require('ro-crate');
const fs = require('fs-extra');
const {Collector, generateArcpId} = require('oni-ocfl');
const {DataPack} = require('@ldac/data-packs');
const {LdacProfile} = require('ldac-profile');

const {languageProfileURI, Vocab} = require("language-data-commons-vocabs");
const {getLanguagePack, loadSiegfried} = require("./src/helpers")
const {storeObject, storeCollection } = require("./src/items")

const shell = require("shelljs");
const path = require('path');

const {first} = require('lodash');

const PRONOM_URI_BASE = 'https://www.nationalarchives.gov.uk/PRONOM/';

let reRunSiegfied = true; // TODO: put in config

async function main() {

    const vocab = new Vocab;
    await vocab.load();

    const languageEntity = await getLanguagePack('English');

    const collector = new Collector();
    const siegfriedFilePath = path.join(collector.dataDir, "siegfriedOutput.json");
    let siegfriedData = loadSiegfried(collector, reRunSiegfied, siegfriedFilePath);

    await collector.connect(); // Make or find the OCFL repo
    // Get a new crate

    // This is the main crate - TODO: actually have some data in the template collector.templateCrateDir and add it below.
    const corpus = collector.newObject(collector.templateCrateDir);

    const corpusCrate = corpus.crate;

    //corpusCrate.addContext(vocab.getContext());
    const corpusRoot = corpus.rootDataset;
    corpusRoot.language = corpusRoot.language || languageEntity;
    corpusCrate.addProfile(languageProfileURI('Collection'));
    corpusRoot['@type'] = ['Dataset', 'RepositoryCollection'];
    console.log(corpusRoot["@id"]);

    //if (collector.opts.multiple) {
    let filesDealtWith = {};
    let itemsDealtWith = [];
    const topLevelObject = collector.newObject(); // Main collection
    topLevelObject.crate.addProfile(languageProfileURI('Collection'));
    topLevelObject.mintArcpId();

    for(let item of corpusCrate.getGraph()) {
        let languages = [];
        console.log(item["@type"]);
        if (item["@type"].includes("RepositoryCollection")) {
            // TODO - Below expression is doing a lookup to find the root that is not the right way -- also logic looks wront -- FIXME
            if ((item['@reverse'] && item['@reverse'].about && item['@reverse'].about.find(i => i['@id'] === 'ro-crate-metadata.json'))) {
                console.log('Do not store already handled');
            } else {
                await storeCollection(collector, item, topLevelObject.rootDataset["@id"], filesDealtWith, siegfriedData, false, itemsDealtWith);
            }
        } else if (item["@type"].includes("RepositoryObject")) {
            console.log("Storing object");
            // TODO: stop if it has already been processed by a sub-collection
            let memberOfId;
            if(item["memberOf"] || item["pcdm:memberOf"]) {
                const memberOf = item["memberOf"]?.[0] || item["pcdm:memberOf"]?.[0];
                memberOfId = memberOf?.['@id'];
            } else {
                // Checking ID
                memberOfId =  item['@reverse']?.['hasMember']?.[0]?.["@id"];
            }
            console.log(memberOfId);
            
            if (memberOfId) {
                item.license = item.license || first(corpusRoot.license);

                await storeObject(collector, item, topLevelObject.rootDataset["@id"], filesDealtWith, siegfriedData, true, itemsDealtWith);
            }

        }
    }

    // Copy props from the template object to our new top level
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

    // Top Level Files
    for (let item of corpusCrate.getGraph()) {
        if (item["@type"].includes("File") && !filesDealtWith[item["@id"]]) {
            await topLevelObject.addFile(item, collector.templateCrateDir)
        }

    }
    await topLevelObject.addToRepo();

    if (reRunSiegfied) {
        console.log(`Writing Siegfried file data to ${siegfriedFilePath}`);
        fs.writeFileSync(siegfriedFilePath, JSON.stringify(siegfriedData));
    }
}


main()
