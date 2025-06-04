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

const conformsTo = {
  RepositoryCollection: { '@id': 'https://w3id.org/ldac/profile#Collection' },
  RepositoryObject: { '@id': 'https://w3id.org/ldac/profile#Object' }
}

async function main() {
  const collector = new Collector();
  // move siegfried to oni-ocfl with a cli flag
  //const siegfriedFilePath = path.join(collector.dataDir, "siegfriedOutput.json");
  //let siegfriedData = loadSiegfried(collector, reRunSiegfied, siegfriedFilePath);

  await collector.connect(); // Make or find the OCFL repo
  // Get a new crate

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

    // do a BFS traversal and ensure hierarchy first
    const externalized = new Map();
    const externalizedTarget = new Map();
    externalized.set(corpusRoot['@id'], corpusRoot);
    const queue = [corpusRoot]; // corpusRoot is the top level object
    let entity;
    while (entity = queue.shift()) {
      const members = [].concat(entity['pcdm:hasMember'] || [], entity['@reverse']?.['pcdm:memberOf'] || []);
      for (const member of members) {
        if (!externalized.has(member['@id'])) {
          externalized.set(member['@id'], member);
          queue.push(member);
          member['pcdm:memberOf'] = [entity, ...(member['pcdm:memberOf'] || [])];
        }
      }
      corpusCrate.deleteProperty(entity, 'pcdm:hasMember');
    }

    /** Recursively copy entity only if it is not externalized */
    function copyEntity(source, target) {
      for (const propName in source) {
        if (propName === '@id') {
          if (!target['@id']) target[propName] = source[propName];
        } else {
          target[propName] = source[propName].map(v => {
            if (v['@id']) {
              if (externalized.has(v['@id'])) {
                return { '@id': v['@id'] };
              } else {
                return copyEntity(v, {});
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
    for (const source of externalized.values()) {
      const colObj = collector.newObject();
      const parent = externalized.get(source['pcdm:memberOf']?.[0]?.['@id']);
      let curPath;
      if (parent) {
        if (!source['@id'].startsWith(corpusRoot['@id'] + '/')) {
          const parentId = parent['@id'].replaceAll('#', '').replace(re, '');
          const sourceId = source['@id'].replaceAll('#', '');
          curPath = parentId ? [parentId, sourceId] : sourceId;
        }
        // remove hasPart from parent
        const targetParent = externalizedTarget.get(parent['@id']);
        if (targetParent) {
          targetParent.hasPart
        }
      }
      colObj.mintArcpId(curPath);
      const target = colObj.crate.root;
      externalizedTarget.set(target['@id'], target);

      console.log(`Processing object: ${target['@id']}`);

      copyEntity(source, target);

      // ensure conformsTo
      for (const type of target['@type']) {
        if (conformsTo[type]) {
          if (!target.conformsTo?.length) {
            target.conformsTo = conformsTo[type];
          }
        }
      }
      for (const propName of ['dct:rightsHolder', 'author', 'accountablePerson', 'publisher']) {
        target[propName] = target[propName] || parent?.[propName];
      }
      target['@type'].push('Dataset');
      await colObj.addToRepo();
    }
  } else {
    // For single bundled crate, we just add everything to the repo
    await corpus.addToRepo();
  }
}

main();
