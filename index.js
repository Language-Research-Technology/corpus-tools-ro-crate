const { Collector, generateArcpId } = require('oni-ocfl');
const { languageProfileURI, Languages, Vocab } = require('language-data-commons-vocabs');
const XLSX = require('xlsx');
const { DataPack } = require('@describo/data-packs');
const fs = require('fs-extra');
const { LdacProfile } = require('ldac-profile');
const shell = require("shelljs");
const PRONOM_URI_BASE = 'https://www.nationalarchives.gov.uk/PRONOM/';

async function main() {

    const vocab = new Vocab;

    await vocab.load();
    const languages = new Languages();
    await languages.fetch();
    let datapack = new DataPack({ dataPacks: ['Glottolog'], indexFields: ['name'] });

    await datapack.load();
    let engLang = datapack.get({
        field: "name",
        value: "English",
    });

    const collector = new Collector();

    await collector.connect(); // Make or find the OCFL repo
    // Get a new crate

    // This is the main crate - TODO: actually have some data in the template collector.templateCrateDir and add it below.
    const corpus = collector.newObject();

    const corpusCrate = corpus.crate;
    corpusCrate.addContext(vocab.getContext());
    const corpusRoot = corpus.rootDataset;

    corpus.mintArcpId();
    corpusCrate.addProfile(languageProfileURI('Collection'));

    corpusRoot['@type'] = ['Dataset', 'RepositoryCollection'];
    const data = await fs.readJSON(collector.excelFile);
    console.log(data);

}

main()
