const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/KIIT/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fixture = { current: { temperature_2m: 32, apparent_temperature: 34, weather_code: 0, is_day: 1, relative_humidity_2m: 65, wind_speed_10m: 12, wind_direction_10m: 45, surface_pressure: 1010, visibility: 10000, cloud_cover: 20 }, daily: { sunrise: ['2026-10-13T06:00'], sunset: ['2026-10-13T18:00'] } };
(async () => {
    const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    try {
        const context = await browser.newContext({ timezoneId: 'Pacific/Honolulu' });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(() => Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: success => success({ coords: { latitude: 20.2961, longitude: 85.8245 } }) } }));
        let payload = structuredClone(fixture);
        let reverse = { features: [{ properties: { city: 'Bhubaneswar', state: 'Odisha', country: 'India' } }] };
        let failReverse = false, failWeather = false;
        let holdReverse = null;
        const forecasts = [], reverseRequests = [];
        await page.route('https://geocoding-api.open-meteo.com/**', route => {
            const name = new URL(route.request().url()).searchParams.get('name');
            return route.fulfill({ json: { results: name === 'invalidxyz123' ? [] : [{ name, admin1: name === 'Delhi' ? ' Delhi ' : 'England', country: name === 'Delhi' ? 'India' : 'United Kingdom', latitude: 28.6, longitude: 77.2 }] } });
        });
        await page.route('https://api.open-meteo.com/**', route => {
            forecasts.push(new URL(route.request().url()));
            return route.fulfill(failWeather ? { status: 503, body: '{}' } : { json: structuredClone(payload) });
        });
        await page.route('https://photon.komoot.io/reverse**', async route => {
            reverseRequests.push(new URL(route.request().url()));
            const response = structuredClone(reverse);
            if (holdReverse) await holdReverse;
            await route.fulfill(failReverse ? { status: 503, body: '{}' } : { json: response });
        });
        await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
        await page.waitForTimeout(1400);
        const formatting = [
            [{ city: 'Delhi', state: ' delhi ', country: 'India' }, { name: 'Delhi', details: 'India' }],
            [{ city: 'Bhubaneswar', state: 'Odisha', country: 'India' }, { name: 'Bhubaneswar', details: 'Odisha, India' }],
            [{ city: 'London', country: 'United Kingdom' }, { name: 'London', details: 'United Kingdom' }],
            [{ city: 'London' }, { name: 'London', details: '' }],
            [{ city: null, state: 'Odisha', country: 'India' }, { name: 'Odisha', details: 'India' }],
            [{ city: '  New   York ', state: 'new york', country: null }, { name: 'New York', details: '' }]
        ];
        for (const [location, expected] of formatting) assert.deepEqual(await page.evaluate(location => formatLocation(location), location), expected);

        async function verifyResult(city, details, code, isDay, icon) {
            await page.waitForFunction(city => document.querySelector('#location-name').textContent === city && document.querySelector('#status-message').textContent === '', city);
            assert.equal(await page.locator('#location-details').textContent(), details);
            assert.equal(await page.locator('#weather-icon').textContent(), icon);
            assert.equal(await page.locator('#temperature').textContent(), '32°C');
            const expected = await page.evaluate(({ code, isDay }) => WeatherBackground.getWeatherVideo(code, isDay), { code, isDay });
            await page.waitForFunction(expected => {
                const video = document.querySelector('video.is-visible');
                return video?.getAttribute('src') === expected && !video.paused && getComputedStyle(video).opacity === '1' && document.querySelectorAll('video[src]').length === 1;
            }, expected);
        }
        const icons = [[0, 1, '☀️'], [0, 0, '🌙'], [1, 0, '🌙'], [2, 1, '🌤️'], [2, 0, '☁️'], [3, 0, '☁️'], [61, 0, '🌧️'], [65, 1, '🌧️'], [95, 0, '⛈️'], [73, 0, '❄️'], [45, 0, '🌫️']];
        for (const [code, isDay, icon] of icons) {
            payload.current.weather_code = code;
            payload.current.is_day = isDay;
            await page.locator('#location-input').fill('Delhi');
            await page.locator('#location-input').press('Enter');
            await verifyResult('Delhi', 'India', code, isDay, icon);
        }
        assert.equal(await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone), 'Pacific/Honolulu');
        console.log('PASS central formatting, all condition/daylight icons, real matching videos and Delhi night independent of browser timezone/32°C');

        payload.current.weather_code = 0;
        payload.current.is_day = 0;
        await page.locator('#use-location-button').click();
        await verifyResult('Bhubaneswar', 'Odisha, India', 0, 0, '🌙');
        assert.equal(reverseRequests.at(-1).searchParams.get('lat'), '20.2961');
        assert.equal(reverseRequests.at(-1).searchParams.get('lon'), '85.8245');
        assert.equal(forecasts.at(-1).searchParams.get('latitude'), '20.2961');
        assert.equal(forecasts.at(-1).searchParams.get('longitude'), '85.8245');
        const src = await page.locator('video.is-visible').getAttribute('src');
        const time = await page.locator('video.is-visible').evaluate(video => video.currentTime);
        await page.locator('#theme-toggle').click();
        await page.waitForTimeout(500);
        assert.equal(await page.locator('video.is-visible').getAttribute('src'), src);
        assert.equal(await page.locator('#weather-icon').textContent(), '🌙');
        assert.ok(await page.locator('video.is-visible').evaluate(video => video.currentTime) > time);
        console.log('PASS geolocation name/region/country and weather share browser coordinates; night icon/video survive theme changes');

        reverse = { features: [{ properties: { name: 'Delhi', osm_value: 'city', state: 'Delhi', country: 'India' } }] };
        await page.locator('#use-location-button').click();
        await verifyResult('Delhi', 'India', 0, 0, '🌙');
        reverse = { features: [{ properties: { city: 'London', country: 'United Kingdom' } }] };
        await page.locator('#use-location-button').click();
        await verifyResult('London', 'United Kingdom', 0, 0, '🌙');
        failReverse = true;
        await page.locator('#use-location-button').click();
        await verifyResult('20.2961°, 85.8245°', '', 0, 0, '🌙');
        failReverse = false;
        for (const query of ['invalidxyz123', 'Delhi']) {
            failWeather = query === 'Delhi';
            await page.locator('#location-input').fill(query);
            await page.locator('#location-input').press('Enter');
            await page.waitForFunction(() => /Location not found|Unable to load/.test(document.querySelector('#status-message').textContent));
            assert.equal(await page.locator('#location-name').textContent(), '20.2961°, 85.8245°');
            assert.equal(await page.locator('#weather-icon').textContent(), '🌙');
        }
        failWeather = false;
        let release;
        holdReverse = new Promise(resolve => { release = resolve; });
        await page.locator('#use-location-button').click();
        await page.waitForFunction(() => document.querySelector('#status-message').textContent === 'Loading weather...');
        payload.current.weather_code = 3;
        payload.current.is_day = 1;
        await page.locator('#location-input').fill('London');
        await page.locator('#location-input').press('Enter');
        await verifyResult('London', 'England, United Kingdom', 3, 1, '☁️');
        release(); holdReverse = null;
        await page.waitForTimeout(300);
        assert.equal(await page.locator('#location-details').textContent(), 'England, United Kingdom');
        assert.equal(await page.locator('#weather-icon').textContent(), '☁️');
        assert.deepEqual(errors, []);
        console.log('PASS reverse-result name fallback, missing region, duplicate region, failed reverse lookup/weather/search, stale geolocation response and no uncaught errors');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
