#! /usr/bin/env node

import * as fs from 'node:fs/promises';

const filter = /fatture-([0-9_-]{10})-([0-9_-]{10}).csv/;

function parseDate(s) {
    let a = s.split('_');
    return a[2] + a[1] + a[0];
}

let cover = [];

for (const file of await fs.readdir('.')) {
    let m = filter.exec(file);
    if (!m) continue;
    let start = parseDate(m[1]);
    let end = parseDate(m[2]);
    if (end < start) throw new Error('Error in filename: ' + file);
    cover.push([start, end]);
}
cover.sort((a, b) => a[0] - b[0]);
console.log(cover);
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
console.log('Range you have covered:', cover);
if (cover.length > 1) {
    let t = null;
    for (const r of cover) {
        if (t != null)
            console.log('Missing range: ' + t + ' - ' + r[0]);
        t = r[1];
    }
}
