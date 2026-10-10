const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
module.exports = async function checkAlphabet(page) {
    const root = path.resolve(__dirname, '../data/locations');
    const index = JSON.parse(fs.readFileSync(path.join(root, 'index.json')));
    const input = page.locator('#location-input');
    for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
        assert(index.shards[letter], `Missing data for ${letter}`);
        const rows = JSON.parse(fs.readFileSync(path.join(root, index.shards[letter])));
        assert(rows.length > 0, `Empty data for ${letter}`);
        for (const query of [letter, letter.toUpperCase(), rows[0][1]]) {
            await input.fill('');
            await input.fill(query);
            await page.waitForFunction(() => document.querySelectorAll('#location-suggestions [role=option]').length > 0);
            const results = await page.evaluate(() => suggestions);
            const key = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            assert(results.every(place => place.key.startsWith(key)), `Wrong suggestions for ${query}`);
            assert(results.some(place => place.type === 'city'), `Missing city suggestions for ${query}`);
            if (query === rows[0][1]) assert(results.some(place => place.type === 'city' && place.name === query), `Missing exact city ${query}`);
            assert.equal(await input.getAttribute('aria-expanded'), 'true');
        }
    }
    console.log('PASS every A–Z / a–z letter and an exact city from each letter');
};
