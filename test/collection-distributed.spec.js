import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { rimraf } from 'rimraf';
import { convertRoCrateToOcfl } from '../lib/index.js';

// The udhr-translations fixture has:
//   5 RepositoryCollections  (1 root + Afro-Asiatic, Indo-European, Uralic, Mongolic)
//   12 RepositoryObjects
// Distributed mode creates a separate OCFL object directory for each entity.
const EXPECTED_OBJECT_COUNT = 17;

const dataDir = 'test_data/udhr-translations';
const distributedRepoPath = path.join('temp', 'test-distributed-ocfl');
const namespace = 'udhr-distributed';

/**
 * Recursively walk dir, collecting every `__object__` directory path.
 * Each `__object__` dir is the root of one OCFL object.
 */
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

describe('Distributed conversion', function () {
    this.timeout(30000);

    let result;

    before(async function () {
        rimraf.sync(distributedRepoPath);
        result = await convertRoCrateToOcfl({
            repoPath: distributedRepoPath,
            dataDir,
            namespace,
            distributed: true
        });
    });

    after(function () {
        rimraf.sync(distributedRepoPath);
    });

    it('Should return mode "distributed"', function () {
        assert.equal(result.mode, 'distributed');
    });

    it('Should return the correct repoPath and namespace', function () {
        assert.equal(result.repoPath, distributedRepoPath);
        assert.equal(result.namespace, namespace);
    });

    it('Should return a collector instance', function () {
        assert.ok(result.collector);
    });

    it('Should write the OCFL repository marker file', function () {
        assert.ok(existsSync(path.join(distributedRepoPath, '0=ocfl_1.1')));
    });

    it(`Should create ${EXPECTED_OBJECT_COUNT} separate OCFL objects`, function () {
        const objectDirs = findOcflObjectDirs(distributedRepoPath);
        assert.equal(objectDirs.length, EXPECTED_OBJECT_COUNT,
            `Expected ${EXPECTED_OBJECT_COUNT} object dirs, got ${objectDirs.length}`);
    });

    it('Should create sub-collection objects nested under their parent', function () {
        // Layout: <repo>/arcp_name_...[/SubCollection[/Object]]/__object__
        // Root collection sits at relative depth 2 (arcp_name_xxx/__object__)
        // Everything deeper is a sub-collection or RepositoryObject
        const objectDirs = findOcflObjectDirs(distributedRepoPath);
        const nestedDirs = objectDirs.filter(p => {
            const rel = path.relative(distributedRepoPath, p);
            return rel.split(path.sep).length > 2;
        });
        assert.ok(nestedDirs.length >= 16,
            `Expected at least 16 nested object dirs, got ${nestedDirs.length}`);
    });

    it('Should produce more than one OCFL object (not bundled)', function () {
        const objectDirs = findOcflObjectDirs(distributedRepoPath);
        assert.ok(objectDirs.length > 1,
            'Distributed mode should produce more than one OCFL object');
    });
});
