#!/usr/bin/env node

/*
This is part of the Lanaguge Data Commons tools

(c) The University of Queensland 2025

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
//const { DataPack } = require('@ldac/data-packs');

//const { languageProfileURI, Vocab } = require("language-data-commons-vocabs");
const { path } = require('path');
const escape = require('regexp.escape');
const { arrayBuffer } = require('stream/consumers');

const conformsTo = {
    RepositoryCollection: { '@id': 'https://w3id.org/ldac/profile#Collection' },
    RepositoryObject: { '@id': 'https://w3id.org/ldac/profile#Object' }
}

async function main() {
    const collector = await Collector.create();

    // This is the main crate
    const corpus = collector.newObject(collector.dataDir);
    corpus.mintArcpId();
    const corpusCrate = corpus.crate;
    const corpusRoot = corpusCrate.root;
    const re = new RegExp(`^${escape(corpusRoot['@id'])}/*`);

    if (collector.opts.multiple) {
        // For distributed crate, the original crate in `corpus` won't be saved,
        // it gets broken up into multiple objects and a new top level object is created,
        // which is a clone of the root data entity in the input crate.

        // Do a BFS traversal to ensure hierarchy is encoded in memberOf property and create a list of externalized entities
        // The choice of using BFS or DFS is arbitrary and will result in a different tree hierarchy if there is a cycle in the input graph
        // By using either a queue or a stack we can easily change from a BFS (queue) or a DFS (stack)
        // In contrast to using a recursion which limit us to only DFS because it is a stack based by nature
        /** A list of entities that need to be put into separate crates or ocfl objects @type {Map<string, object>} */
        const externalized = new Map();
        externalized.set(corpusRoot['@id'], corpusRoot);
        const queue = [corpusRoot]; // corpusRoot is the top level object, put it in the queue as the starting point
        let entity;
        while (entity = queue.shift()) {
            const members = [].concat(entity['pcdm:hasMember'] || [], entity['@reverse']?.['pcdm:memberOf'] || []);
            for (const member of members) {
                if (!externalized.has(member['@id'])) {
                    member['pcdm:memberOf'] = [entity, ...(member['pcdm:memberOf'] || [])];
                    externalized.set(member['@id'], member);
                    queue.push(member);
                }
            }
            corpusCrate.deleteProperty(entity, 'pcdm:hasMember');
        }
        let processedEntities = [];

        /** Recursively copy entity only if it is not externalized */
        function copyEntity(source, target) {
            processedEntities.push(source["@id"]);
            for (const propName in source) {
                if (propName === '@id') {
                    if (!target['@id']) target[propName] = source[propName];
                } else if (propName === 'hasPart' && source['@type'].includes('RepositoryCollection')) {
                    // remove hasPart from any RepositoryCollection
                } else {

                    target[propName] = source[propName].map(v => {
                        if (v['@id']) {
                            if (v['@id'].startsWith("#")) {
                                let parentObj = externalized.get(source['pcdm:memberOf']?.[0]?.['@id']);
                                v["@id"] = generateArcpId(parentObj["@id"].replace("arcp://name,", ""), propName.toLowerCase().replace(/.+:/, ""), v["@id"].replace("#", ""));
                            }
                            if (externalized.has(v['@id'])) {
                                // if the value is an externalized entity, make it into a reference instead
                                return { '@id': v['@id'] };
                            } else if (!processedEntities.includes(v["@id"])) {
                                return copyEntity(v, {});
                            } else {
                                return v; // object that is not an externalized entity
                            }
                        } else {

                            return v; // primitive value or non-@id object
                        }
                    });
                }
            }
            return target;
        }

        // create an ocfl object for each of the externalized entities
        for (const source of Array.from(externalized.values())) {
            const colObj = collector.newObject();
            const parent = externalized.get(source['pcdm:memberOf']?.[0]?.['@id']);
            // generate iri based on the parent-child hierarchy
            let curPath;
            if (parent) {
                if (!source['@id'].startsWith(corpusRoot['@id'] + '/')) {
                    const parentId = parent['@id'].replaceAll('#', '').replace(re, '');
                    const sourceId = source['@id'].replaceAll('#', '');
                    curPath = parentId ? [parentId, sourceId] : sourceId;
                }
            }
            colObj.mintArcpId(curPath);
            const target = colObj.crate.root;

            console.log(`Processing object: ${target['@id']}`);

            // rename id in the source so that all the references is renamed too
            externalized.delete(source['@id']); // must change the key in the externalized map too
            externalized.set(target['@id'], source);
            source['@id'] = target['@id'];

            copyEntity(source, target);

            // ensure conformsTo
            for (const type of target['@type']) {
                if (conformsTo[type]) {
                    if (!target.conformsTo?.length) {
                        target.conformsTo = conformsTo[type];
                    }
                }
            }
            // add mandatory properties at the root level

            for (const propName of ['dct:rightsHolder', 'author', 'accountablePerson', 'publisher']) {
                target[propName] = source[propName] = target[propName] || parent?.[propName];

            }


            target['@type'].push('Dataset');
            //cleanup dodgy dates
            for (const propName of ["datePublished"]) {
                if (!target[propName][0].match(/^\d{4}/)) {
                    console.log("Fixing date");
                    let timestamp = Date.parse(target[propName][0]);
                    let aDate = new Date(timestamp).toLocaleDateString("en-AU");
                    let newDate = aDate.split("/")
                    newDate = `${newDate[2]}-${newDate[1]}-${newDate[0]}`;
                    target[propName] = [newDate];
                }
            }


            await colObj.addToRepo();
        }
    } else {
        // For single bundled crate, we just add everything to the repo
        await corpus.addToRepo();
    }
}

main();
