const {languageProfileURI} = require("language-data-commons-vocabs");
const {readSiegfried, loadSiegfried, getAustlangData} = require("./helpers")

async function storeCollection(collector, item, collectionId, filesDealtWith, siegfriedData, isTop, itemsDealtWith) {
    console.log(item['@id']);
    if (itemsDealtWith.includes(item['@id'])) {
        console.log('skip')
    } else {
        itemsDealtWith.push(item['@id']);
        if (item["@type"].includes("RepositoryCollection")) {
            const itemCollection = collector.newObject();
            let languages;
            itemCollection.crate.addProfile(languageProfileURI('Collection'));
            const subCollectionId = item["@id"].replace(/#/g, "");
            itemCollection.mintArcpId(subCollectionId);
            itemCollection.crate.rootDataset["@id"] = itemCollection.id;
            itemCollection.crate.rootDataset["@type"] = item["@type"];
            for (let prop of Object.keys(item)) {
                if (prop === "hasPart") {
                    for (let f of item.hasPart) {
                        if (f["@type"] && f["@type"].includes("File")) {
                            if (!f["encodingFormat"][1]["@id"]) {
                                let fileSF;
                                readSiegfried(siegfriedData, f, f["@id"], fileSF, collector.dataDir)
                            }
                            await itemCollection.addFile(f, collector.templateCrateDir);
                            filesDealtWith[f["@id"]] = true;
                        }
                    }
                } else if (prop === "memberOf") {
                    // BAD HACK ---
                    itemCollection.crate.rootDataset.memberOf = item.memberOf.map((m) => {
                        return {"@id": collectionId}
                    });
                }
            }
            await itemCollection.addToRepo();
            isTop = false;
            for (let hasMember of item?.hasMember) {
                if (hasMember['@type'].includes('RepositoryCollection')) {
                    await storeCollection(collector, hasMember, subCollectionId, filesDealtWith, siegfriedData, isTop, itemsDealtWith)
                } else if (hasMember["@type"].includes("RepositoryObject")) {
                    await storeObject(collector, hasMember, subCollectionId, filesDealtWith, siegfriedData, isTop, itemsDealtWith);
                }
            }
        }
    }
}

async function storeObject(collector, item, collectionId, filesDealtWith, siegfriedData, isTop, itemsDealtWith) {
    console.log("Storing item as object", item['@id']);
    if (itemsDealtWith.includes(item['@id'])) {
        console.log('skip');
    } else {
        itemsDealtWith.push(item['@id']);
        const itemObject = collector.newObject();
        let languages;
        itemObject.crate.addProfile(languageProfileURI('Object'));
        for (let prop of Object.keys(item)) {
            if (prop === "hasPart") {
                for (let f of item.hasPart) {
                    if (f["@type"] && f["@type"].includes("File")) {
                        if (!f["encodingFormat"]?.[1]?.["@id"]) {
                            let fileSF;
                            readSiegfried(siegfriedData, f, f["@id"], fileSF, collector.dataDir)
                        }
                        await itemObject.addFile(f, collector.templateCrateDir);
                        filesDealtWith[f["@id"]] = true;
                    }
                }
            } else if (prop === "memberOf") {
                // BAD HACK ---
                itemObject.crate.rootDataset.memberOf ={"@id": collectionId}
                
            } else if ((prop === "language_code") || (prop === "language" && !item.hasOwnProperty("language_code"))) {
                // Lookup language data - prefer lanaguage_code info, fallback to language info

                for (let l in item[prop]) {
                    // TODO: lang is never used
                    // const lang = datapack.get({
                    //     field: "name", value: item[prop][l],
                    // });
                    let Austlang = await getAustlangData(item[prop][l]);
                    languages = [...Austlang]
                }

            } else {
                itemObject.crate.rootDataset[prop] = item[prop];
            }
        }

        for (let part of item["@reverse"].partOf) {
            part = part.toJSON(); // Because it goes in circles (maybe proxy)
            itemObject.crate.addEntity(part);
            if (part["@type"] && part["@type"].includes("File")) {

                if (!part["encodingFormat"]) {
                    let fileSF;
                    readSiegfried(siegfriedData, part, part["@id"], fileSF, collector.dataDir)
                }
                await itemObject.addFile(part, collector.dataDir);
                filesDealtWith[part["@id"]] = true;
                // TODO: reciprocal hasPart links
            }
        }
        if (isTop) {
            itemObject.mintArcpId('object', item["@id"].replace(/#/g, ""));
        } else {
            itemObject.mintArcpId([collectionId.replace(/#/g, ""), "object", item["@id"].replace(/#/g, "")]);
        }
        itemObject.crate.rootDataset["@id"] = itemObject.id;
        itemObject.crate.rootDataset["@type"] = item["@type"];
        itemObject.crate.rootDataset["@type"].push("Dataset");

        // WORSE HACK
        itemObject.crate.rootDataset.memberOf = {"@id": collectionId}
        itemObject.crate.rootDataset.language = languages;
        await itemObject.addToRepo();
    }
}


module.exports = {
    storeObject,
    storeCollection
}
