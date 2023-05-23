#! /usr/bin/env node

import * as fs from 'node:fs/promises';
import * as crypto from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';

const filenameCSV = /fatture-([0-9_-]{10})-([0-9_-]{10}).csv/;
const filenameMeta = /informazioni_associate_[0-9]+].xml|.*_meta.xml/;
const hash = crypto.createHash('sha256');

function parseDate(s) {
    let a = s.split(/[_/]/);
    return a[2] + a[1] + a[0];
}

function unquote(s) {
    return s.replace(/'/g, '');
}

let cover = [];
let fatture = {};

for (const file of await fs.readdir('.')) {
    let m = filenameCSV.exec(file);
    if (m) { // CSV index
        let start = parseDate(m[1]);
        let end = parseDate(m[2]);
        if (end < start) throw new Error('Error in filename: ' + file);
        cover.push([start, end]);
        for (const row of (await fs.readFile(file, 'utf8')).split(/\r?\n/)) {
            if (row == '') continue;
            const col = row.split(';');
            if (col.length != 9) throw new Error('Error in CSV: ' + file + '\n' + row);
            if (col[0] != 'Fattura') continue;
            const id = col[7];
            fatture[id] = Object.assign(fatture[id] || { filename: null }, {
                filename: null,
                data: parseDate(col[2]),
                // numero: unquote(col[1]),
                // fornitore: unquote(col[3]),
            });
        }
    }
    m = filenameMeta.exec(file);
    if (m) try { // metadata
        const parser = new XMLParser();
        let o = parser.parse(await fs.readFile(file, 'utf8'));
        let meta = {};
        for (const m of o.metadatiFattura.metadato)
            meta[m.nome] = m.valore;
        const id = meta.idfile;
        let valid;
        try {
            const content = await fs.readFile(meta.nomefile);
            valid = meta.hashfile == hash.copy().update(content).digest('hex');
        } catch (e) {
            valid = 'error: ' + e.message;
        }
        fatture[id] = Object.assign(fatture[id] || {}, {
            filename: meta.nomefile,
            // hash: meta.hashfile,
            valid
        });
        // console.log(meta);
        // process.exit(1);
    } catch (e) {
        throw new Error('Invalid metadata file: ' + file);
    }
}
// fatture.sort((a, b) => a - b);
console.log(fatture);
cover.sort((a, b) => a[0] - b[0]);
// console.log(cover);
cover = cover.reduce((acc, val) => {
    // console.log('red', acc, val);
    if (!Array.isArray(acc[0]))
        acc = [acc];
    const last = acc[acc.length - 1];
    if (val[0] > last[0] && val[0] <= last[1])
        acc[acc.length - 1][1] = val[1];
    else if (val[0] > last[1])
        acc.push(val);
    else
        throw new Error('Error in range: ' + acc + ' ' + val);
    return acc;
});
console.log('Finestra temporale coperta:', cover.map(a => a[0] + '-' + a[1]).join(' '));
// console.log('Finestra temporale coperta:', cover);
// if (cover.length > 1) {
//     let t = null;
//     for (const r of cover) {
//         if (t != null)
//             console.log('Finestra temporale mancante: ' + t + ' - ' + r[0]);
//         t = r[1];
//     }
// }
let trovate = 0, mancanti = 0;
for (const e of Object.entries(fatture)) {
    if (e[1].valid === true)
        ++trovate;
    else
        ++mancanti;
}
console.log('Fatture scaricate:', trovate);
console.log('Fatture mancanti: ', mancanti);
