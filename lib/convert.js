/*
This is part of the Language Data Commons tools

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

import oniOcfl from 'oni-ocfl';
import escape from 'regexp.escape';
import path from 'path';
import fs from 'fs';

const { Collector, generateArcpId } = oniOcfl;

const conformsTo = {
    RepositoryCollection: { '@id': 'https://w3id.org/ldac/profile#Collection' },
    RepositoryObject: { '@id': 'https://w3id.org/ldac/profile#Object' }
};

/**
 * Convert an RO-Crate to OCFL format
 * @param {Object} options - Conversion options
 * @param {string} options.repoPath - Output OCFL repository path (required)
 * @param {string} options.dataDir - Input RO-Crate directory (required)
 * @param {string} options.namespace - Namespace for ARCP IRI (required)
 * @param {boolean} [options.distributed=false] - Create distributed OCFL objects
 * @param {boolean} [options.runSiegfried=false] - Run Siegfried for file format identification
 * @param {string} [options.templateCrateDir] - Template crate directory
 * @param {string} [options.validationProfile] - Validation profile URL/path
 * @returns {Promise<Object>} Conversion result with collector and summary
 */
async function convertRoCrateToOcfl(options) {
    const {
        repoPath,
        dataDir,
        namespace,
        distributed,
        runSiegfried = false,
        inputs,
        templateCrateDir,
        validationProfile,
        mainPackage
    } = options;

    const isDistributed = distributed ?? false;

    // Validation
    if (!repoPath) throw new Error('repoPath is required');
    if (!dataDir) throw new Error('dataDir is required');
    if (!namespace) throw new Error('namespace is required');

    // oni-ocfl reads Collector.mainPackage (the static field) inside the constructor flow.
    // This is why we set Collector.mainPackage before Collector.create(...)
    // Use provided mainPackage or fall back to Collector.mainPackage

    const resolvedMainPackage = Collector.mainPackage || mainPackage;
    if (!resolvedMainPackage?.repository?.url) {
        Collector.mainPackage = resolveCallerPackage(mainPackage);
    }
    if (!Collector.mainPackage?.repository?.url) {
        throw new Error('mainPackage.url is required (pass it or ensure package.json has a url field)');
    }
    // Create collector with provided options
    const collectorOpts = {
        repoPath,
        dataDir,
        namespace,
        multiple: isDistributed,
        runSiegfried,
        inputs,
        mainPackage: resolvedMainPackage,
        ...(templateCrateDir && { templateCrateDir }),
        ...(validationProfile && { validationProfile })
    };



    const collector = await Collector.create(collectorOpts);
    // Create the main corpus object
    const corpus = collector.newObject(collector.dataDir);
    corpus.mintArcpId();
    const corpusCrate = corpus.crate;
    const corpusRoot = corpusCrate.root;
    const re = new RegExp(`^${escape(corpusRoot['@id'])}/*`);

    // Process root license
    const rootLicense = corpusRoot['license']?.[0]?.["@id"];
    if (rootLicense) {
        let rootLicenseContent = corpusCrate.getEntity(rootLicense);
        if (rootLicenseContent && rootLicenseContent["@type"]?.includes("DataReuseLicense")) {
            rootLicenseContent["@type"] = ["ldac:DataReuseLicense"];
            corpusCrate.updateEntity(rootLicense, rootLicenseContent);
        }
    }

    if (isDistributed) {
        // Distributed mode: split into multiple OCFL objects
        await convertDistributed(collector, corpus, corpusRoot, corpusCrate, re);
    } else {
        // Bundled mode: single OCFL object
        await corpus.addToRepo();
    }

    return {
        collector,
        repoPath,
        namespace,
        mode: isDistributed ? 'distributed' : 'bundled'
    };
}

/**
 * Process distributed conversion (multiple OCFL objects)
 * @private
 */
async function convertDistributed(collector, corpus, corpusRoot, corpusCrate, re) {
    // BFS traversal to encode hierarchy
    const externalized = new Map();
    externalized.set(corpusRoot['@id'], corpusRoot);
    const queue = [corpusRoot];
    let entity;

    while (entity = queue.shift()) {
        const members = [].concat(
            entity['pcdm:hasMember'] || [],
            entity['@reverse']?.['pcdm:memberOf'] || []
        );
        for (const member of members) {
            if (!externalized.has(member['@id'])) {
                member['pcdm:memberOf'] = [entity, ...(member['pcdm:memberOf'] || [])];
                externalized.set(member['@id'], member);
                queue.push(member);
            }
        }
        corpusCrate.deleteProperty(entity, 'pcdm:hasMember');
    }

    const processedEntities = [];

    // Helper: recursively copy entity, respecting externalized boundaries
    function copyEntity(source, target) {
        processedEntities.push(source["@id"]);
        for (const propName in source) {
            if (propName === '@id') {
                if (!target['@id']) target[propName] = source[propName];
            } else if (propName === 'hasPart' && source['@type']?.includes('RepositoryCollection')) {
                // Remove hasPart from RepositoryCollections
                continue;
            } else {
                const propValue = source[propName];
                if (!Array.isArray(propValue)) {
                    target[propName] = propValue;
                    continue;
                }
                target[propName] = propValue.map(v => {
                    if (v && v['@id'] && typeof v['@id'] === 'string') {
                        if (v['@id'].startsWith("#")) {
                            try {
                                let parentObj = externalized.get(source['pcdm:memberOf']?.[0]?.['@id']);
                                v["@id"] = generateArcpId(
                                    parentObj["@id"].replace("arcp://name,", ""),
                                    propName.toLowerCase().replace(/.+:/, ""),
                                    v["@id"].replace("#", "")
                                );
                            } catch (e) {
                                console.error(`Failed to generate ARCP ID for ${v['@id']} for ${JSON.stringify(source[propName])} with parent  ${source['pcdm:memberOf']?.[0]?.['@id']}`);
                            }
                        }
                        if (externalized.has(v['@id'])) {
                            // Reference to externalized entity
                            return { '@id': v['@id'] };
                        } else if (!processedEntities.includes(v["@id"])) {
                            return copyEntity(v, {});
                        } else {
                            return v;
                        }
                    } else {
                        return v; // Primitive or non-@id object
                    }
                });
            }
        }
        return target;
    }

    // Create OCFL object for each externalized entity
    for (const source of Array.from(externalized.values())) {
        const colObj = collector.newObject();
        const parent = externalized.get(source['pcdm:memberOf']?.[0]?.['@id']);

        let curPath;
        if (parent) {
            if (!source['@id'].startsWith(corpusRoot['@id'] + '/')) {
                const parentId = parent['@id'].replaceAll('#', '').replace(re, '');
                const sourceId = source['@id'].replaceAll('#', '');
                curPath = parentId ? [parentId, sourceId] : sourceId;
            } else if (source['@id'].startsWith('arcp://name,')) {
                const sourceId = source['@id'].replaceAll('#', '').replace(re, '');
                curPath = sourceId;
            }

        }

        colObj.mintArcpId(curPath);
        const target = colObj.crate.root;

        console.log(`Processing source ${source['@id']} object: ${target['@id']}`);

        // Update IDs in externalized map
        externalized.delete(source['@id']);
        externalized.set(target['@id'], source);
        source['@id'] = target['@id'];

        copyEntity(source, target);

        // Ensure conformsTo profile
        for (const type of target['@type']) {
            if (conformsTo[type]) {
                if (!target.conformsTo?.length) {
                    target.conformsTo = conformsTo[type];
                }
            }
        }

        // Add mandatory root properties
        for (const propName of ['dct:rightsHolder', 'author', 'accountablePerson', 'publisher']) {
            target[propName] = source[propName] = target[propName] || parent?.[propName];
        }

        target['@type'].push('Dataset');

        // Normalize dates to ISO 8601
        for (const propName of ["datePublished"]) {
            if (target[propName]?.[0] && !target[propName][0].match(/^\d{4}/)) {
                console.log("Fixing date format");
                let timestamp = Date.parse(target[propName][0]);
                let aDate = new Date(timestamp).toLocaleDateString("en-AU");
                let newDate = aDate.split("/");
                newDate = `${newDate[2]}-${newDate[1]}-${newDate[0]}`;
                target[propName] = [newDate];
            }
        }

        try {
            await colObj.addToRepo();
        } catch (e) {
            colObj
            console.error(`Failed to add object ${target['@id']} to repository: ${e.message}`);
        }
    }
}

function findPackageJson(startDir) {
    let dir = startDir;
    while (dir && dir !== path.dirname(dir)) {
        const p = path.join(dir, 'package.json');
        if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
        dir = path.dirname(dir);
    }
    return null;
}

function resolveCallerPackage(mainPackageFromOptions) {
    if (mainPackageFromOptions) return mainPackageFromOptions;

    const entryScript = process.argv[1] ? path.dirname(path.resolve(process.argv[1])) : null;
    const fromEntry = entryScript ? findPackageJson(entryScript) : null;
    if (fromEntry) return fromEntry;

    return findPackageJson(process.cwd()) || {};
}

export {
    convertRoCrateToOcfl
};
