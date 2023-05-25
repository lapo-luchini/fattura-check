#! /usr/bin/env node

// download files from https://dichiarazioneprecompilata.agenziaentrate.gov.it/FattureWeb/#/fatture/elenco

import * as fs from 'node:fs/promises';
import { XMLParser } from 'fast-xml-parser';

const filenameMeta = /informazioni_associate_[0-9]+[.]xml/;
const filenameExt = /[.]xml([.].*)/i;

for (const file of await fs.readdir('.')) {
    let m = filenameMeta.exec(file);
    if (m) try { // metadata
        const parser = new XMLParser();
        let o = parser.parse(await fs.readFile(file, 'utf8'));
        let meta = {};
        for (const m of o.metadatiFattura.metadato)
            meta[m.nome] = m.valore;
        console.log(file, '→', meta.nomefile.replace(filenameExt, '_meta.xml'));
        await fs.rename(file, meta.nomefile.replace(filenameExt, '_meta.xml'));
    } catch (e) {
        console.log(e);
        throw new Error('Invalid metadata file: ' + file);
    }
}
