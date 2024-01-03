const assert = require("assert");
const {Collector} = require('oni-ocfl');

const basePath = 'test-data/sydney-speaks';
const repoPath = path.join(basePath, 'ocfl');
const namespace = 'sydney-speaks';
const dataDir = path.join(basePath, 'files');
const templateCrateDir = path.join(basePath, 'template');

let collector;
let corpusCrateRootId;
let repository;
describe("Create OCFL Repo", function () {

    beforeAll(function () {
        rimraf.sync(repoPath);
        console.log(`${repoPath} deleted`);
    })
    it("Should make a new Collector", async function () {
        collector = new Collector({repoPath, namespace, dataDir, templateCrateDir});
        assert.equal(collector.opts.repoPath, repoPath);
    });

});
