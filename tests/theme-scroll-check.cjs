const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/KIIT/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const weather = { current: { temperature_2m: 24, relative_humidity_2m: 70, apparent_temperature: 26, weather_code: 2, cloud_cover: 45, surface_pressure: 1008, visibility: 10000, wind_speed_10m: 12, wind_direction_10m: 45 }, daily: { sunrise: ['2026-10-13T06:00'], sunset: ['2026-10-13T18:00'] }, timezone: 'Asia/Kolkata' };
(async () => {
    const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        let failWeather = false;
        await page.route('https://photon.komoot.io/reverse**', route => route.fulfill({ json: { features: [{ properties: { city: 'Delhi', state: 'Delhi', country: 'India' } }] } }));
        await page.route('https://geocoding-api.open-meteo.com/**', route => {
            const name = new URL(route.request().url()).searchParams.get('name');
            return route.fulfill({ json: { results: name === 'invalidxyz123' ? [] : [{ name, latitude: 28.6, longitude: 77.2, country: 'Test country' }] } });
        });
        await page.route('https://api.open-meteo.com/**', async route => {
            await new Promise(resolve => setTimeout(resolve, 150));
            await route.fulfill(failWeather ? { status: 503, body: '{}' } : { json: weather });
        });
        await page.addInitScript(() => {
            window.weatherScrolls = [];
            const original = Element.prototype.scrollIntoView;
            Element.prototype.scrollIntoView = function(options) {
                if (this.id === 'weather') window.weatherScrolls.push({ options, name: document.querySelector('#location-name').textContent, temperature: document.querySelector('#temperature').textContent });
                return original.call(this, options);
            };
        });
        await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
        await page.waitForTimeout(1100);
        assert.equal(await page.evaluate(() => weatherScrolls.length), 0);
        const toggle = page.locator('#theme-toggle');
        assert.equal(await toggle.count(), 1);
        assert.equal(await toggle.locator('svg').nth(0).getAttribute('fill'), '#043259');
        assert.equal(await toggle.locator('svg').nth(1).getAttribute('fill'), '#FD960F');
        async function checkTheme(light) {
            await page.waitForTimeout(300);
            assert.equal(await page.evaluate(() => document.body.classList.contains('light-theme')), light);
            assert.equal(await toggle.getAttribute('aria-pressed'), String(light));
            assert.equal(await toggle.getAttribute('aria-label'), light ? 'Switch to dark mode' : 'Switch to light mode');
            assert.equal(await page.locator('.theme-toggle__thumb').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m41), light ? 34 : 0);
        }
        await checkTheme(false);
        await toggle.click(); await checkTheme(true);
        await page.reload(); await checkTheme(true);
        await toggle.click(); await checkTheme(false);
        await page.reload(); await checkTheme(false);
        await toggle.focus(); await page.keyboard.press('Enter'); await checkTheme(true);
        await page.keyboard.press('Space'); await checkTheme(false);
        await toggle.evaluate(el => { for (let i = 0; i < 9; i++) el.click(); }); await checkTheme(true);
        console.log('PASS theme directions, exact SVG colors, one-click/rapid-click, keyboard, refresh persistence');
        async function search(query, enter) {
            await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
            await page.locator('#location-input').fill(query);
            const count = await page.evaluate(() => weatherScrolls.length);
            if (enter) await page.locator('#location-input').press('Enter');
            else await page.locator('.search-button').click();
            assert.equal(await page.evaluate(() => weatherScrolls.length), count);
            await page.waitForFunction(n => weatherScrolls.length > n, count);
            await page.waitForTimeout(1100);
            const result = await page.evaluate(() => ({ scroll: weatherScrolls.at(-1), heading: document.querySelector('.section-heading').getBoundingClientRect().top, header: document.querySelector('.site-header').getBoundingClientRect().bottom, x: scrollX, overflow: document.documentElement.scrollWidth > innerWidth }));
            assert.equal(result.scroll.name, query);
            assert.equal(result.scroll.temperature, '24°C');
            assert.ok(result.heading >= result.header);
            assert.equal(result.x, 0); assert.equal(result.overflow, false);
            return result;
        }
        for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            await page.waitForFunction(() => {
                const links = document.querySelector('.nav-links');
                return innerWidth > 480 || getComputedStyle(links).visibility === 'hidden';
            });
            const boxes = await page.evaluate(() => [...document.querySelectorAll('.brand, #theme-toggle, #menu-toggle, .nav-links')].filter(el => getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden').map(el => ({ id: el.className, x: el.getBoundingClientRect().x, right: el.getBoundingClientRect().right })));
            boxes.sort((a,b) => a.x-b.x);
            for (let i=1;i<boxes.length;i++) assert.ok(boxes[i].x >= boxes[i-1].right, JSON.stringify(boxes));
            if (width < 481) {
                await page.locator('#menu-toggle').click();
                assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'), 'true');
                assert.ok(await page.locator('.nav-links').evaluate(el => el.getBoundingClientRect().height >= innerHeight));
                await page.keyboard.press('Escape');
                assert.equal(await page.locator('.menu-overlay').evaluate(el => getComputedStyle(el).pointerEvents), 'none');
            }
            await search('Delhi', true);
            console.log('PASS layout, successful Enter search and navbar offset: ' + width);
        }
        await search('London', false);
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await page.locator('#location-input').fill('London');
        await page.locator('#location-suggestions [role=option]').first().waitFor();
        let count = await page.evaluate(() => weatherScrolls.length);
        await page.locator('#location-suggestions [role=option]').filter({ hasText: /City/ }).first().click();
        await page.waitForFunction(n => weatherScrolls.length > n, count);
        assert.equal(await page.locator('#location-suggestions').isVisible(), false);
        console.log('PASS London Search button and real local autocomplete city selection');
        for (const query of ['', 'invalidxyz123', 'Delhi']) {
            failWeather = query === 'Delhi';
            await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
            await page.locator('#location-input').fill(query);
            count = await page.evaluate(() => weatherScrolls.length);
            await page.locator('.search-button').click();
            await page.waitForFunction(() => /Please enter|Location not found|Unable to load/.test(document.querySelector('#status-message').textContent));
            await page.waitForTimeout(300);
            assert.equal(await page.evaluate(() => weatherScrolls.length), count);
        }
        failWeather = false;
        await page.evaluate(() => Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: success => success({ coords: { latitude: 28.6, longitude: 77.2 } }) } }));
        count = await page.evaluate(() => weatherScrolls.length);
        await page.locator('#use-location-button').click();
        await page.waitForFunction(n => weatherScrolls.length > n, count);
        await page.evaluate(() => { window.scrollTo({top:0,behavior:'instant'}); Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (success, failure) => failure({code:1}) } }); });
        count = await page.evaluate(() => weatherScrolls.length);
        await page.locator('#use-location-button').click();
        assert.equal(await page.locator('#status-message').textContent(), 'Location permission was denied.');
        assert.equal(await page.evaluate(() => weatherScrolls.length), count);
        console.log('PASS empty, invalid, failed API: no scroll; geolocation granted/denied');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const result = await search('Delhi', true);
        assert.equal(result.scroll.options.behavior, 'auto');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await toggle.click(); await checkTheme(false);
        assert.equal((await search('London', false)).scroll.options.behavior, 'smooth');
        assert.deepEqual(errors, []);
        console.log('PASS reduced motion, both themes, no initial scroll, no page errors');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
