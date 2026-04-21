import assert from 'node:assert';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { rimraf } from 'rimraf';
import { ROCrate } from 'ro-crate';
import { Collector } from 'oni-ocfl';
import packageJson from '../package.json' with { type: 'json' };
import { convertRoCrateToOcfl } from '../lib/index.js';

Collector.mainPackage = packageJson;

const dataDir = 'test_data/udhr-translations';
const repoPath = path.join('temp', 'test-rocrate-option-ocfl');
const namespace = 'udhr-rocrate-option';

function findOcflObjectDirs(dir) {
    const results = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const full = path.join(dir, entry.name);
        if (entry.name === '__object__') {
            results.push(full);
        } else {
            results.push(...findOcflObjectDirs(full));
        }
    }
    return results;
}

/**
 * Load a fresh ROCrate from the test fixture and optionally mutate it.
 */
function loadTestCrate(mutateFn) {
    const raw = JSON.parse(readFileSync(path.join(dataDir, 'ro-crate-metadata.json'), 'utf8'));
    const crate = new ROCrate(raw, { array: true, link: true });
    if (mutateFn) mutateFn(crate);
    return crate;
}

describe('options.rocrate', function () {
    this.timeout(30000);

    after(function () {
        rimraf.sync(repoPath);
    });

    it('Should throw TypeError when options.rocrate is not an object or ROCrate instance', async function () {
        await assert.rejects(
            convertRoCrateToOcfl({
                repoPath,
                dataDir,
                namespace,
                rocrate: 'not-an-object'   // invalid type
            }),
            (err) => {
                assert.ok(err instanceof TypeError, 'Expected TypeError');
                assert.match(err.message, /options\.rocrate must be a ROCrate instance or a plain RO-Crate JSON object/);
                return true;
            }
        );
    });

    it('Should accept a plain JSON object and rehydrate it into a ROCrate instance', async function () {
        const CUSTOM_NAME = 'Custom ROCrate injected by test';
        const crate = loadTestCrate(c => {
            c.root.name = CUSTOM_NAME;
        });

        rimraf.sync(repoPath);
        const result = await convertRoCrateToOcfl({
            repoPath,
            dataDir,
            namespace,
            rocrate: crate.toJSON()   // Pass plain object to test that it works even without ROCrate instance methods
        });

        assert.equal(result.mode, 'bundled');
        assert.ok(existsSync(path.join(repoPath, '0=ocfl_1.1')), 'OCFL marker file should exist');
    });

    it('Should preserve mutated root name when plain JSON is injected via options.rocrate', async function () {
        const CUSTOM_NAME = 'Injected name for assertion';
        const crate = loadTestCrate(c => {
            c.root.name = CUSTOM_NAME;
        });

        rimraf.sync(repoPath);
        await convertRoCrateToOcfl({
            repoPath,
            dataDir,
            namespace,
            rocrate: crate.toJSON()   // Pass plain object to test that mutation is preserved even without ROCrate instance methods
        });

        // Read the written ro-crate-metadata.json from the OCFL object on disk
        const objectDir = path.join(repoPath, `arcp_name_${namespace}`, '__object__');
        const versions = readdirSync(objectDir).filter(d => d.startsWith('v'));
        assert.ok(versions.length > 0, 'Expected at least one version directory');
        versions.sort();
        const lastVersion = versions[versions.length - 1];
        const contentDir = path.join(objectDir, lastVersion, 'content');
        const crateFile = path.join(contentDir, 'ro-crate-metadata.json');
        assert.ok(existsSync(crateFile), `ro-crate-metadata.json should exist at ${crateFile}`);
        const written = JSON.parse(readFileSync(crateFile, 'utf8'));
        const rootEntity = written['@graph'].find(e => e['@id'] === `arcp://name,${namespace}`);
        assert.ok(rootEntity, 'Root entity with arcp:// @id should exist in written crate');
        const writtenName = Array.isArray(rootEntity.name) ? rootEntity.name[0] : rootEntity.name;
        assert.equal(writtenName, CUSTOM_NAME,
            `Written root name should be the injected value "${CUSTOM_NAME}", got "${writtenName}"`);
    });

    it('Should preserve descriptor-level license in distributed mode when JSON is injected via options.rocrate', async function () {
        const DESCRIPTOR_LICENSE = 'https://example.org/licenses/custom-distributed';
        const crate = loadTestCrate(c => {
            const descriptor = c.getEntity('ro-crate-metadata.json') || { '@id': 'ro-crate-metadata.json' };
            descriptor.license = [{ '@id': DESCRIPTOR_LICENSE }];
            c.updateEntity('ro-crate-metadata.json', descriptor);
        });

        rimraf.sync(repoPath);
        await convertRoCrateToOcfl({
            repoPath,
            dataDir,
            namespace,
            distributed: true,
            rocrate: crate.toJSON()
        });

        const objectDirs = findOcflObjectDirs(repoPath);
        assert.ok(objectDirs.length > 1, 'Expected distributed mode to produce multiple OCFL objects');

        for (const objectDir of objectDirs) {
            const versions = readdirSync(objectDir).filter(d => d.startsWith('v')).sort();
            assert.ok(versions.length > 0, `Expected at least one version dir in ${objectDir}`);
            const crateFile = path.join(objectDir, versions[versions.length - 1], 'content', 'ro-crate-metadata.json');
            assert.ok(existsSync(crateFile), `ro-crate-metadata.json should exist at ${crateFile}`);

            const written = JSON.parse(readFileSync(crateFile, 'utf8'));
            const descriptor = written['@graph'].find(e => e['@id'] === 'ro-crate-metadata.json');
            assert.ok(descriptor, `Descriptor should exist in ${crateFile}`);

            const license = descriptor.license?.[0]?.['@id'];
            assert.equal(license, DESCRIPTOR_LICENSE,
                `Descriptor license should be preserved as ${DESCRIPTOR_LICENSE} in ${crateFile}, got ${license}`);
        }
    });
});
