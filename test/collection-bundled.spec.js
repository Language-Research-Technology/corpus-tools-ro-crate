import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { Collector } from 'oni-ocfl';
import path from 'node:path';
import { rimraf } from 'rimraf';
import packageJson from '../package.json' with { type: 'json' };
import { convertRoCrateToOcfl } from '../lib/index.js';

Collector.mainPackage = packageJson;

const basePath = 'test_data/udhr-translations';
const repoPath = path.join(basePath, 'ocfl');
const namespace = 'udhr-translations';
const dataDir = basePath;

let collector;
describe("Create OCFL Repo", function () {

    before(function () {
        rimraf.sync(repoPath);
        console.log(`${repoPath} deleted`);
    })
    it("Should make a new Collector", async function () {
        collector = new Collector({repoPath, namespace, dataDir});
        assert.equal(collector.opts.repoPath, repoPath);
    });

});

describe('Library API', function () {
    const libraryRepoPath = path.join('temp', 'test-library-api-ocfl');

    before(function () {
        rimraf.sync(libraryRepoPath);
    });

    after(function () {
        rimraf.sync(libraryRepoPath);
    });

    it('Should reject when repoPath is missing', async function () {
        await assert.rejects(
            convertRoCrateToOcfl({
                dataDir,
                namespace
            }),
            /repoPath is required/
        );
    });

    it('Should reject when dataDir is missing', async function () {
        await assert.rejects(
            convertRoCrateToOcfl({
                repoPath: libraryRepoPath,
                namespace
            }),
            /dataDir is required/
        );
    });

    it('Should reject when namespace is missing', async function () {
        await assert.rejects(
            convertRoCrateToOcfl({
                repoPath: libraryRepoPath,
                dataDir
            }),
            /namespace is required/
        );
    });

    it('Should run bundled conversion and return result metadata', async function () {
        const result = await convertRoCrateToOcfl({
            repoPath: libraryRepoPath,
            dataDir,
            namespace: 'udhr-library-api-bundled'
        });

        assert.equal(result.mode, 'bundled');
        assert.equal(result.repoPath, libraryRepoPath);
        assert.equal(result.namespace, 'udhr-library-api-bundled');
        assert.ok(result.collector);
        assert.ok(existsSync(path.join(libraryRepoPath, '0=ocfl_1.1')));
    });
});
