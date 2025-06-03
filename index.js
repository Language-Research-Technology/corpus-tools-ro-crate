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
const { loadSiegfried } = require("./src/helpers")
const { path } = require('path');

let reRunSiegfied = false; // TODO: put in cli arguments

async function processMembers(collector, members, paths, corpusRoot) {
  for (const member of members) {
    // check if it's a collection or object
    // if conformsTo is empty, set to a default one, which is "https://w3id.org/ldac/profile#Collection/Object"

    const ocflObject = collector.newObject();
    //ocflObject.mintArcpId(); //depends on the type collection vs object
    const localPaths = paths.concat();
    ocflObject.mintArcpId(localPaths, member['@id']);
    if (member['@type'].includes('RepositoryCollection')) {
      copyProps(member, ocflObject.crate.root, collector, localPaths, corpusRoot);
    } else if (member['@type'].includes('RepositoryObject')) {
      for (const propName in member) {
        switch (propName) {
          case 'pcdm:hasMember':
            break;
          case 'hasPart':
          default:
            ocflObject.crate.root[propName] = member[propName];
        }
      }
    }
    for (const propName of ['dct:rightsHolder', 'author', 'accountablePerson', 'publisher']) {
      ocflObject.crate.root[propName] = ocflObject.crate.root[propName] || corpusRoot[propName];
    }
    ocflObject.crate.root['@type'].push('Dataset');
    await ocflObject.addToRepo();
  }
}

async function copyProps(source, target, collector, paths = [], corpusRoot) {
  for (const propName in source) {
    switch (propName) {
      case 'pcdm:hasMember':
        await processMembers(collector, source['pcdm:hasMember'], paths, corpusRoot);
        break;
      case 'hasPart':
        break;
      default:
        target[propName] = source[propName];
    }
  }
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

  if (collector.opts.multiple) {
    // For distributed crate, the original crate in `corpus` won't be saved,
    // it gets broken up into multiple objects and a new top level object is created,
    // which is a clone of the root data entity in the input crate.
    const topLevelObject = collector.newObject();
    topLevelObject.mintArcpId();
    await copyProps(corpusRoot, topLevelObject.crate.root, collector, [], corpusRoot);
    //console.log(topLevelObject.crate.root.toJSON());
    await topLevelObject.addToRepo();
  } else {
    await corpus.addToRepo();
  }

  // if (reRunSiegfied) {
  //   console.log(`Writing Siegfried file data to ${siegfriedFilePath}`);
  //   fs.writeFileSync(siegfriedFilePath, JSON.stringify(siegfriedData));
  // }
}

main();
