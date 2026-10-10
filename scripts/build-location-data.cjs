const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');

const release = 'v4.0-export.42';
const repository = 'https://github.com/dr5hn/countries-states-cities-database';
const source = `${repository}/releases/download/${release}/json-countries%2Bstates%2Bcities.json.gz`;
const destination = path.resolve(__dirname, '../data/locations');
const normalize = name => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

async function download(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed: ${response.status} ${url}`);
    return Buffer.from(await response.arrayBuffer());
}

(async function () {
    const compressed = await download(source);
    const raw = zlib.gunzipSync(compressed);
    const countries = JSON.parse(raw);
    const manifest = { countries: [], states: [], shards: {}, counts: {} };
    const shards = new Map();
    let cityCount = 0;
    for (const country of countries) {
        manifest.countries.push([country.id, country.name, country.iso2]);
        for (const state of country.states || []) {
            let firstShard = '';
            for (const city of state.cities || []) {
                const latitude = Number(city.latitude), longitude = Number(city.longitude);
                if (!city.name || city.latitude == null || city.longitude == null
                    || !Number.isFinite(latitude) || !Number.isFinite(longitude)
                    || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
                    throw new Error(`Invalid city coordinates: ${city.id}`);
                }
                const key = normalize(city.name);
                const letter = [...key][0];
                if (!firstShard || letter < firstShard) firstShard = letter;
                if (!shards.has(letter)) shards.set(letter, []);
                shards.get(letter).push([key, city.name, state.id, latitude, longitude]);
                cityCount++;
            }
            manifest.states.push([state.id, state.name, country.id, firstShard]);
        }
    }
    manifest.countries.sort((a, b) => a[1].localeCompare(b[1], 'en'));
    manifest.states.sort((a, b) => a[1].localeCompare(b[1], 'en'));
    fs.mkdirSync(path.join(destination, 'cities'), { recursive: true });
    let processedBytes = 0, largestShardBytes = 0;
    for (const [letter, records] of shards) {
        records.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1].localeCompare(b[1], 'en'));
        const filename = `cities/${letter.codePointAt(0).toString(16)}.json`;
        const json = JSON.stringify(records);
        const bytes = Buffer.byteLength(json);
        fs.writeFileSync(path.join(destination, filename), json);
        fs.writeFileSync(path.join(destination, filename.replace(/\.json$/, '.js')), 'window[document.currentScript.dataset.callback](' + json + ');\n');
        manifest.shards[letter] = filename;
        processedBytes += bytes;
        largestShardBytes = Math.max(largestShardBytes, bytes);
    }
    manifest.counts = { countries: manifest.countries.length, states: manifest.states.length, cities: cityCount };
    const manifestJSON = JSON.stringify(manifest);
    fs.writeFileSync(path.join(destination, 'index.json'), manifestJSON);
    fs.writeFileSync(path.join(destination, 'index.js'), 'window[document.currentScript.dataset.callback](' + manifestJSON + ');\n');
    processedBytes += Buffer.byteLength(manifestJSON);
    const metadata = {
        repository, release, source, license: 'ODbL-1.0',
        licenseURL: 'https://opendatacommons.org/licenses/odbl/1-0/',
        sourceSHA256: crypto.createHash('sha256').update(compressed).digest('hex'),
        originalCompressedBytes: compressed.length, originalJSONBytes: raw.length,
        processedBytes, indexBytes: Buffer.byteLength(manifestJSON), largestShardBytes,
        shardCount: shards.size, counts: manifest.counts,
        fields: { countries: ['id', 'name', 'iso2'], states: ['id', 'name', 'country_id', 'first_city_prefix'], cities: ['normalized_name', 'name', 'state_id', 'latitude', 'longitude'] }
    };
    fs.writeFileSync(path.join(destination, 'source.json'), JSON.stringify(metadata, null, 2) + '\n');
    fs.writeFileSync(path.join(destination, 'LICENSE'), await download(`https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/${release}/LICENSE`));
    console.log(JSON.stringify(metadata, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
