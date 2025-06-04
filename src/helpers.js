const fs = require("fs-extra");
const path = require("path");
const PRONOM_URI_BASE = 'https://www.nationalarchives.gov.uk/PRONOM/';

async function getAustlangData(term) {
    console.log(`Searching Austlang for ${term}`);
    const url = 'https://data.gov.au/data/api/3/action/datastore_search?resource_id=e9a9ea06-d821-4b53-a05f-877409a1a19c&q=';
    let resp = await fetch(url + term);
    let itemData = JSON.parse(await resp.text());
    let langData = itemData.result.records;
    let langItems = [];
    for (i of langData) {
        let langObject = {
            "@id": i.uri, "@type": "Language", "languageCode": i.language_code, "name": i.language_name, geo: {
                "@id": `#${i.language_name.replace(/\s/g, "")}`,
                "@type": "GeoCoordinates",
                "name": `Geographical coverage for ${i.language_name}`,
                "geojson": `{"type":"Feature", "properties:{"name":"${i.language_name}","geometry":{"type":"Point","coordinates":["${i.approximate_longitude_of_language_variety}","${i.approximate_latitude_of_language_variety}"]}}`,
            }, source: "Austlang", sameAs: [], alternateName: i.language_synonym.split("|"),
        }
        langItems.push(langObject);
    }
    return langItems;
}

function loadSiegfried(collector, reRunSiegfied, siegfriedFilePath) {
    let siegfriedData = {}
    if (fs.existsSync(siegfriedFilePath) || !reRunSiegfied) {
        console.log("Reading Siegfried Data");
        try {
            siegfriedData = JSON.parse(fs.readFileSync(siegfriedFilePath));
        } catch (e) {
            console.error(e);
            process.exit(1);
        }
    }
    return siegfriedData;
}
function readSiegfried(siegfriedData, objFile, fileID, fileSF, dataDir) {

    if (siegfriedData[fileID]) {
        fileSF = siegfriedData[fileIDStore].files[0];
    } else {
        let sfData;
        try {
            console.log(`Running Siegfried on "${fileID}"`);
            if (fs.existsSync(path.join(dataDir, fileID))) {
                sfData = JSON.parse(shell.exec(`sf -nr -json "${path.join(dataDir, fileID)}"`, {silent: true}).stdout);
            } else {
                console.log(`Missing file "${path.join(dataDir, fileID)}"`);
            }
        } catch (e) {
            console.error("File identification error: " + e);
            console.error("Have you installed Siegfried?");
            console.error("https://github.com/richardlehane/siegfried/wiki/Getting-started");
            process.exit(1);
        }
        if (typeof sfData !== 'undefined') {
            fileSF = sfData.files[0];
            siegfriedData[fileID] = sfData;
        }
    }
    if (!objFile['encodingFormat']) {
        objFile['encodingFormat'] = [];
    }
    if (typeof fileSF !== 'undefined') {
        objFile['encodingFormat'].push(fileSF.matches[0].mime);
        let formatID = PRONOM_URI_BASE + fileSF.matches[0].id
        objFile['encodingFormat'].push({'@id': formatID})
        objFile['extent'] = fileSF.filesize;
    }
    //TODO: some cases encodingFormat is not found like eaf files
}


module.exports = {
    getAustlangData,
    loadSiegfried,
    readSiegfried
}