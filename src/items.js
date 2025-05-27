const { languageProfileURI } = require("language-data-commons-vocabs");
const { readSiegfried, loadSiegfried, getAustlangData } = require("./helpers");
const path = require("path");

async function storeCollection(collector, item, collectionId, filesDealtWith, siegfriedData, isTop, itemsDealtWith, subCollection) {
    //console.log("collection", item['@id']);
    if (itemsDealtWith.includes(item['@id'])) {
        console.log('skip')
    } else {
        itemsDealtWith.push(item['@id']);
        if (item["@type"].includes("RepositoryCollection")) {
            const itemCollection = collector.newObject();
            let languages;
            itemCollection.crate.addProfile(languageProfileURI('Collection'));
            const subCollectionId = item["@id"].replace(/#/g, "");
            //console.log(subCollectionId)
            itemCollection.mintArcpId(subCollectionId);
            itemCollection.crate.rootDataset["@id"] = itemCollection.id;
            itemCollection.crate.rootDataset["@type"] = item["@type"];
            for (let prop of Object.keys(item)) {
                if (prop === "hasPart") {
                    for (let f of item.hasPart) {
                        if (f["@type"] && f["@type"].includes("File")) {
                            if (!f["encodingFormat"][1]["@id"]) {
                                let fileSF;
                                // console.log("Read Siegfried")
                                readSiegfried(siegfriedData, f, f["@id"], fileSF, path.join(collector.dataDir, subCollection))
                            }
                            //await itemCollection.addFile(f, path.join(collector.templateCrateDir, subCollection), null, false);
                            filesDealtWith[f["@id"]] = true;
                        }
                    }
                } else if (prop === "memberOf") {
                    // BAD HACK ---
                    itemCollection.crate.rootDataset.memberOf = item.memberOf.map((m) => {
                        return { "@id": collectionId }
                    });
                } else if (prop === "pcdm:memberOf") {
                    itemCollection.crate.rootDataset["pcdm:memberOf"] = item["pcdm:memberOf"].map((m) => {
                        return { "@id": collectionId }
                    });
                } else if (prop === "datePublished") {
                    let newDate = new Date(Date.parse(item[prop]));
                    itemCollection.crate.rootDataset[prop] = newDate.toISOString().split("T")[0];
                } else {
                    itemCollection.crate.rootDataset[prop] = item[prop]
                }
            }
            await itemCollection.addToRepo();
            isTop = false;
            //console.log(item.hasMember)
            // for (let hasMember of item?.hasMember) {
            //     if (hasMember['@type'].includes('RepositoryCollection')) {
            //         await storeCollection(collector, hasMember, subCollectionId, filesDealtWith, siegfriedData, isTop, itemsDealtWith, subCollection)
            //     } else if (hasMember["@type"].includes("RepositoryObject")) {
            //         await storeObject(collector, hasMember, subCollectionId, filesDealtWith, siegfriedData, isTop, itemsDealtWith, subCollection);
            //     }
            // }

        }
    }
}

async function storeObject(collector, item, collectionId, filesDealtWith, siegfriedData, isTop, itemsDealtWith, subCollection) {
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
                            // console.log("Read Siegfried")
                            readSiegfried(siegfriedData, f, f["@id"], fileSF, collector.dataDir)
                        }
                        await itemObject.addFile(f, collector.dataDir);
                        filesDealtWith[f["@id"]] = true;
                    }
                }
            } else if (prop === "memberOf") {
                // BAD HACK ---
                itemObject.crate.rootDataset.memberOf = { "@id": collectionId }

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
                    // console.log("Read Siegfried")
                    readSiegfried(siegfriedData, part, part["@id"], fileSF, path.join(collector.dataDir, subCollection))
                }
                // await itemObject.addFile(part, path.join(collector.dataDir, subCollection), null, false);
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
        itemObject.crate.rootDataset.memberOf = { "@id": collectionId }
        itemObject.crate.rootDataset.language = languages;
        await itemObject.addToRepo();
    }
}


module.exports = {
    storeObject,
    storeCollection
}
