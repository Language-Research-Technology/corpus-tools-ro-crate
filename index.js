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


const { Collector, generateArcpId } = require('oni-ocfl');
const { DataPack } = require('@describo/data-packs');
const fs = require('fs-extra');
const { LdacProfile } = require('ldac-profile');
const {languageProfileURI, Vocab} = require("language-data-commons-vocabs");

async function main() {

    const vocab = new Vocab;
    await vocab.load();

    const datapack = new DataPack({ dataPacks: ['Glottolog'], indexFields: ['name'] });
    /* WORK OFFLINE
    await datapack.load();
    const engLang = datapack.get({
        field: "name",
        value: "English",
    });
    */
    engLang =  {
        "@id": "https://glottolog.org/resource/languoid/id/stan1293",
        "@type": "Language",
        "languageCode": "stan1293",
        "name": "English",
        "geo": {
          "@id": "#English"
        },
        "source": "Glottolog",
        "sameAs": {
          "@id": "https://www.ethnologue.com/language/eng"
        },
        "alternateName": [
          "English (Standard Southern British)",
          "Englisch",
          "Anglais moderne [fr]",
          "English [en]",
          "Inglese moderno [it]",
          "Inglês moderno [pt]",
          "Modern English [en]",
          "Moderna angla lingvo [eo]",
          "Moderne engelsk [no]",
          "Modernes Englisch [de]",
          "Nyengelska [sv]",
          "anglais [fr]",
          "თანამედროვე ინგლისური პერიოდი [ka]",
          "現代英語 [zh]",
          "近代英語 [ja]"
        ],
        "iso639-3": "eng"
      }

    const collector = new Collector();

    await collector.connect(); // Make or find the OCFL repo
    // Get a new crate

    // This is the main crate - TODO: actually have some data in the template collector.templateCrateDir and add it below.
    const corpus = collector.newObject(collector.templateCrateDir);

    const corpusCrate = corpus.crate;
    //corpusCrate.addContext(vocab.getContext());
    const corpusRoot = corpus.rootDataset;
    corpusRoot.language = corpusRoot.language || engLang;
    corpusCrate.addProfile(languageProfileURI('Collection'));
    corpusRoot['@type'] = ['Dataset', 'RepositoryCollection'];

    // TODO ADD SF file stuff if not already there @mark

    if (collector.opts.multiple) {
        filesDealtWith = {};
        const topLevelObject = collector.newObject(); // Main collection
        topLevelObject.crate.addProfile(languageProfileURI('Collection'));
        topLevelObject.mintArcpId();

        for (let item of corpusCrate.getGraph()) {
            if(item["@type"].includes("RepositoryObject")) {
                const itemObject = collector.newObject();
                itemObject.crate.addProfile(languageProfileURI('Object'));
        
                for (let prop of Object.keys(item)) {
                    if (prop === "hasPart") {
                        for (let f of item.hasPart) {
                            if (f["@type"] && f["@type"].includes("File")) {
                                await itemObject.addFile(f, collector.templateCrateDir);
                                filesDealtWith[f["@id"]] = true;
                            }
                        }
                    } else if (prop === "memberOf") {
                        // BAD HACK ---
                        itemObject.crate.rootDataset.memberOf = item.memberOf.map((m) => {return {"@id":topLevelObject.id}});

                    } else
                     {
                        itemObject.crate.rootDataset[prop] = item[prop];
                    }


                }
                
                for (let part of item["@reverse"].partOf) {
                    itemObject.crate.addEntity(part);
                    if (part["@type"] && part["@type"].includes("File")) {
                        await itemObject.addFile(part, collector.templateCrateDir);
                        filesDealtWith[part["@id"]] = true;
                    }

                }
                

                itemObject.mintArcpId("object", item["@id"].replace(/#/g,""));
                itemObject.crate.rootDataset["@id"] = itemObject.id;
                itemObject.crate.rootDataset["@type"] = item["@type"];
                itemObject.crate.rootDataset["@type"].push("Dataset");

                // WORSE HACK
                itemObject.crate.rootDataset.memberOf = {"@id":topLevelObject.id}
                  
               
                await itemObject.addToRepo();

            }
            // Left over parts

           
                    

            }
            
            // Copy pros from the template object to our new top level
            for (let prop of Object.keys(corpusRoot)) {
                if (prop === "hasPart") {
                    
                } else if  (prop === "hasMember")  {
                    console.log("Dealing with members") 
                    // TODO: Make sure each member knows its a memberOf (in the case where hasMember has been specified at the top level)
                } else {
                    topLevelObject.crate.rootDataset[prop] = corpusRoot[prop];
                }
            }
            topLevelObject.crate.rootDataset["@id"] = topLevelObject.id;
            console.log("TOP LEVEL ROOT DATASET", topLevelObject.crate.rootDataset["@id"]); 

            for (let item of corpusCrate.getGraph()) {
                if (item["@type"].includes("File") && !filesDealtWith[item["@id"]]) {
                    await topLevelObject.addFile(item, collector.templateCrateDir)
                }

           

        }
        await topLevelObject.addToRepo();
        // Now deal with hasParts


    } else {
        corpus.mintArcpId();
        for (let item of corpusCrate.getGraph()) {
            if (item["@type"].includes("File")) {
            await corpus.addFile(item, collector.templateCrateDir);
            }
        }
        await corpus.addToRepo();

    }
    // ELSE 



}

main()
