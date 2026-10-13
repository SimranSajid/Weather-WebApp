const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/KIIT/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const index = JSON.parse(fs.readFileSync(path.join(root, 'data/locations/index.json')));
const countries = new Map(index.countries.map(row => [row[0], row]));
const states = new Map(index.states.map(row => [row[0], row]));
assert.equal(countries.size, index.countries.length);
assert.equal(states.size, index.states.length);
let cityCount = 0;
for (const row of states.values()) assert(countries.has(row[2]));
for (const [prefix, file] of Object.entries(index.shards)) {
    const rows = JSON.parse(fs.readFileSync(path.join(root, 'data/locations', file)));
    for (let i = 0; i < rows.length; i++) {
        assert(states.has(rows[i][2]));
        assert(rows[i][0].startsWith(prefix));
        assert(Number.isFinite(rows[i][3]) && Number.isFinite(rows[i][4]));
        if (i) assert(rows[i - 1][0] <= rows[i][0]);
    }
    cityCount += rows.length;
}
assert.equal(cityCount, index.counts.cities);
const baselineFile = path.join(root, '.location-before.json');
if (fs.existsSync(baselineFile)) {
    const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8').replace(/^\uFEFF/, ''));
    const script = fs.readFileSync(path.join(root, 'js/script.js'), 'utf8');
    const boundary = '// ==================== MOBILE NAVIGATION';
    assert.equal(script.slice(script.indexOf(boundary)), baseline['js/script.js'].slice(baseline['js/script.js'].indexOf(boundary)));
    for (const file of ['index.html', 'css/style.css', 'js/script.js']) {
        const regex = file.endsWith('.html') ? /<!--[\s\S]*?-->/g : file.endsWith('.css') ? /\/\*[\s\S]*?\*\//g : /(?<!:)\/\/[^\r\n]*/g;
        const comments = fs.readFileSync(path.join(root, file), 'utf8').match(regex) || [];
        for (const comment of baseline[file].match(regex) || []) assert(comments.includes(comment), `Changed comment: ${comment}`);
    }
}
const server = http.createServer((request, response) => {
    if (request.url === '/favicon.ico') { response.writeHead(204); return response.end(); }
    const relative = request.url === '/' ? 'index.html' : decodeURIComponent(request.url.slice(1));
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { response.writeHead(404); return response.end(); }
    response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.json') ? 'application/json' : 'text/html');
    response.end(fs.readFileSync(file));
});
const weather = { current: { temperature_2m: 25, apparent_temperature: 26, weather_code: 1, relative_humidity_2m: 60, wind_speed_10m: 12, wind_direction_10m: 90, surface_pressure: 1010, visibility: 10000, cloud_cover: 20 }, daily: { sunrise: ['2026-10-10T06:10'], sunset: ['2026-10-10T18:10'] }, timezone: 'Asia/Tokyo' };

(async function () {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    const context = await browser.newContext({ hasTouch: true, permissions: ['geolocation'], geolocation: { latitude: 35.6762, longitude: 139.6503 } });
    const page = await context.newPage();
    const errors = [], consoleErrors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('request', request => requests.push(request.url()));
    const live = process.argv.includes('--live');
    if (!live) {
        await page.route('https://photon.komoot.io/reverse**', route => route.fulfill({ json: { features: [{ properties: { city: 'Tokyo', state: 'Tokyo', country: 'Japan' } }] } }));
        await page.route('https://api.open-meteo.com/**', route => route.fulfill({ json: weather }));
        await page.route('https://geocoding-api.open-meteo.com/**', route => {
            const name = new URL(route.request().url()).searchParams.get('name');
            return route.fulfill({ json: { results: name === 'invalid' ? [] : [{ name, admin1: 'Test Region', country: 'Test Country', latitude: 30, longitude: 77 }] } });
        });
    }
    const url = `http://127.0.0.1:${server.address().port}`;
    await page.goto(url);
    await page.waitForTimeout(1400);
    assert.equal(requests.filter(url => url.includes('/data/locations/')).length, 0);
    await require('./alphabet-autocomplete-check.cjs')(page);
    const input = page.locator('#location-input');
    const options = page.locator('[role=option]');
    async function type(query) {
        await input.fill('');
        await input.fill(query);
        await page.waitForFunction(() => document.querySelectorAll('[role=option]').length > 0);
        return options.locator('span').allTextContents();
    }
    async function select(type, name, touch = false) {
        const labels = await options.locator('span').allTextContents();
        const categories = await options.locator('small').allTextContents();
        const item = labels.findIndex((label, i) => (label === name || label.startsWith(name + ', ')) && categories[i] === type);
        assert(item >= 0, `${type} ${name} not found in ${labels.join(' | ')}`);
        if (touch) await options.nth(item).tap();
        else await options.nth(item).click();
    }
    for (const queries of [['D', 'De', 'Del', 'Delh', 'Delhi'], ['B', 'Bh', 'Bhu', 'Bhubaneswar'], ['M', 'Mu', 'Mum', 'Mumbai'], ['T', 'To', 'Tok', 'Tokyo'], ['L', 'Lo', 'Lon', 'London']]) {
        for (const query of queries) {
            const labels = await type(query);
            assert(labels.length <= 12);
            assert(labels.every(label => label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().startsWith(query.toLowerCase())));
            assert(labels.every(label => !label.includes('undefined') && !label.includes(', ,')));
        }
        console.log('PASS live local filtering: ' + queries.join(' → '));
    }
    const ind = await type('Ind');
    assert(ind.includes('India') && ind.includes('Indonesia'));
    await select('Country', 'India');
    await page.waitForFunction(() => document.querySelectorAll('[role=option]').length > 0);
    assert((await page.evaluate(() => suggestions)).every(place => place.type === 'state' && place.country === 'India'));
    await type('O'); await type('Od'); await type('Odi'); await type('Odisha');
    assert((await page.evaluate(() => suggestions)).every(place => place.type === 'state' && place.country === 'India'));
    await select('State / Province', 'Odisha');
    await page.waitForFunction(() => document.querySelectorAll('[role=option]').length > 0);
    assert((await page.evaluate(() => suggestions)).every(place => place.type === 'city' && place.admin1 === 'Odisha'));
    await type('Bhu');
    assert((await page.evaluate(() => suggestions)).every(place => place.type === 'city' && place.admin1 === 'Odisha' && place.country === 'India'));
    const city = (await page.evaluate(() => suggestions)).find(place => place.name === 'Bhubaneswar');
    assert(city);
    const geocodingBefore = requests.filter(url => url.includes('geocoding-api')).length;
    await select('City', 'Bhubaneswar');
    await page.waitForFunction(() => document.querySelector('#location-name').textContent === 'Bhubaneswar' && document.querySelector('#status-message').textContent === '');
    const forecast = new URL(requests.filter(url => url.includes('api.open-meteo.com')).at(-1));
    assert.equal(Number(forecast.searchParams.get('latitude')), city.latitude);
    assert.equal(Number(forecast.searchParams.get('longitude')), city.longitude);
    await input.press('Enter');
    await page.waitForFunction(() => document.querySelector('#status-message').textContent === '');
    assert.equal(requests.filter(url => url.includes('geocoding-api')).length, geocodingBefore);
    await page.click('#reset-location-context');
    await type('United States'); await select('Country', 'United States');
    await type('California'); await select('State / Province', 'California');
    await type('Los Angeles');
    assert((await page.evaluate(() => suggestions)).every(place => place.admin1 === 'California' && place.country === 'United States'));
    await select('City', 'Los Angeles');
    await page.waitForFunction(() => document.querySelector('#location-name').textContent === 'Los Angeles' && document.querySelector('#status-message').textContent === '');
    await page.click('#reset-location-context');
    await type('Tokyo'); await select('City', 'Tokyo');
    await page.waitForFunction(() => document.querySelector('#location-name').textContent === 'Tokyo' && document.querySelector('#status-message').textContent === '');
    console.log('PASS hierarchy India → Odisha → Bhubaneswar; United States → California → Los Angeles; context reset → Tokyo; direct stored coordinates');
    await type('London'); const londonIndex = await page.evaluate(() => suggestions.findIndex(place => place.type === 'city' && place.name === 'London')); assert(londonIndex >= 0); await input.press('ArrowUp'); assert(await input.getAttribute('aria-activedescendant')); await input.press('ArrowDown'); for (let i = 0; i < londonIndex; i++) await input.press('ArrowDown'); await input.press('Enter');
    await page.waitForFunction(() => document.querySelector('#location-name').textContent === 'London' && document.querySelector('#status-message').textContent === '');
    await type('Delhi'); await input.press('Escape'); assert.equal(await input.getAttribute('aria-expanded'), 'false');
    await input.fill('Delhi'); await input.press('Enter'); await page.waitForFunction(() => document.querySelector('#location-name').textContent === 'Delhi' && document.querySelector('#status-message').textContent === '');
    await input.fill('Mumbai'); await input.press('Escape'); await page.locator('.search-form').evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' })); await page.click('.search-button'); await page.waitForFunction(() => document.querySelector('#location-name').textContent === 'Mumbai' && document.querySelector('#status-message').textContent === '');
    const perf = await page.evaluate(async () => {
        const times = [];
        for (let i = 0; i < 20; i++) {
            const started = performance.now(); await searchLocalLocations(i % 2 ? 'Del' : 'Delhi', null); times.push(performance.now() - started);
        }
        return { max: Math.max(...times), average: times.reduce((a, b) => a + b) / times.length };
    });
    assert(perf.max < 250);
    console.log('Warm worker search milliseconds: ' + JSON.stringify(perf));
    for (const width of (live ? [375] : [320, 375, 390, 430, 768, 1024, 1440])) {
        await page.setViewportSize({ width, height: 900 });
        for (const light of [false, true]) {
            await page.evaluate(light => document.body.classList.toggle('light-theme', light), light);
            await type('D');
            const field = await input.boundingBox(), list = await page.locator('#location-suggestions').boundingBox();
            assert(Math.abs(field.x - list.x) < 1 && Math.abs(field.width - list.width) < 1);
            assert(list.x + list.width <= width);
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
            if (width <= 480) {
                await page.click('#menu-toggle'); assert.equal(await input.getAttribute('aria-expanded'), 'false'); await page.keyboard.press('Escape');
                assert.equal(await page.locator('.menu-overlay').evaluate(e => getComputedStyle(e).pointerEvents), 'none');
                await type('Bhubaneswar'); await select('City', 'Bhubaneswar', true); await page.waitForFunction(() => document.querySelector('#status-message').textContent === '');
            }
        }
        console.log(`PASS ${width}px both themes, alignment, no overflow, menu/touch interaction`);
    }
    await input.press('Escape'); await page.locator('#use-location-button').evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' })); await page.click('#use-location-button'); await page.waitForFunction(() => document.querySelector('#status-message').textContent === '' && document.querySelector('#location-name').textContent.trim() !== 'Current Location');
    if (!live) {
        assert.equal(await page.locator('#location-name').textContent(), 'Tokyo');
        assert.equal(await page.locator('#location-details').textContent(), 'Japan');
    }
    await page.click('#theme-toggle'); const light = await page.evaluate(() => document.body.classList.contains('light-theme')); await page.click('#theme-toggle'); assert.equal(await page.evaluate(() => document.body.classList.contains('light-theme')), !light); await page.reload(); assert.equal(await page.evaluate(() => document.body.classList.contains('light-theme')), !light);
    assert.deepEqual(errors, []); assert.deepEqual(consoleErrors, []);
    console.log('PASS keyboard, manual search, native geolocation simulated coordinates, animations, one-click themes/persistence; no console errors');
    if (!live) {
        await type('India'); await select('Country', 'India'); await type('Odisha'); await select('State / Province', 'Odisha');
        const geoCount = requests.filter(url => url.includes('geocoding-api')).length;
        await input.fill('London'); await input.press('Enter'); await page.waitForFunction(() => document.querySelector('#status-message').textContent.includes('Location not found'));
        assert.equal(requests.filter(url => url.includes('geocoding-api')).length, geoCount);
        await input.fill('Bhubaneswar'); await input.press('Enter'); await page.waitForFunction(() => document.querySelector('#location-name').textContent === 'Bhubaneswar' && document.querySelector('#status-message').textContent === '');
        assert.equal(requests.filter(url => url.includes('geocoding-api')).length, geoCount);
        await page.click('#reset-location-context'); await input.fill('D'); await input.fill('De'); await input.fill('Delhi'); await page.waitForFunction(() => document.querySelectorAll('[role=option]').length > 0);
        assert((await options.locator('span').allTextContents()).every(label => label.startsWith('Delhi')));
        await input.fill(''); await page.waitForTimeout(150); assert.equal(await input.getAttribute('aria-expanded'), 'false');
        await context.route('**/data/locations/index.json', route => route.abort('failed'));
        await page.reload(); await input.fill('D'); await page.waitForTimeout(400); assert.equal(await input.getAttribute('aria-expanded'), 'false');
        await input.fill('Delhi'); await input.press('Enter'); await page.waitForFunction(() => document.querySelector('#location-name').textContent === 'Delhi' && document.querySelector('#status-message').textContent === '');
        await context.unroute('**/data/locations/index.json');
        await page.reload(); await page.setViewportSize({ width: 375, height: 900 }); await page.waitForTimeout(1500); await type('Ind'); await page.waitForTimeout(200); await page.screenshot({ path: path.join(root, '.location-preview.png') });
        console.log('PASS manual state restriction, local exact city submit, rapid/stale input, empty input, unavailable-data manual fallback');
    }
    await browser.close(); server.close();
})().catch(error => { console.error(error); server.close(); process.exit(1); });
