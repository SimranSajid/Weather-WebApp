const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/KIIT/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const requests = [];
// Range support exercises real MP4 decoding without buffering entire clips in Node.
const server = http.createServer((req, res) => {
    if (req.url === '/favicon.ico') { res.writeHead(204); return res.end(); }
    const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1) || 'index.html';
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
    const size = fs.statSync(file).size;
    const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
    const start = match ? Number(match[1]) : 0;
    const end = match && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    if (start >= size || end < start) { res.writeHead(416); return res.end(); }
    const headers = { 'Content-Type': file.endsWith('.mp4') ? 'video/mp4' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.json') ? 'application/json' : 'text/html', 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes' };
    if (match) headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
    requests.push({ relative, status: match ? 206 : 200 });
    res.writeHead(match ? 206 : 200, headers);
    const stream = fs.createReadStream(file, { start, end });
    stream.pipe(res);
    res.on('close', () => stream.destroy());
});
const conditions = [[0, 'clear'], [2, 'partly cloudy'], [3, 'cloudy'], [63, 'rain'], [65, 'heavy rain'], [95, 'thunderstorm'], [73, 'snow'], [45, 'fog'], [1003, 'default']];
const weather = { current: { temperature_2m: 24, apparent_temperature: 26, weather_code: 0, is_day: 1, relative_humidity_2m: 65, wind_speed_10m: 12, wind_direction_10m: 45, surface_pressure: 1010, visibility: 10000, cloud_cover: 20 }, daily: { sunrise: ['2026-10-13T06:00'], sunset: ['2026-10-13T18:00'] } };

(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    try {
        const context = await browser.newContext();
        const page = await context.newPage({ viewport: { width: 1280, height: 900 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const url = `http://127.0.0.1:${server.address().port}`;
        let apiFailure = false;
        let apiResponse = structuredClone(weather);
        await context.route('https://geocoding-api.open-meteo.com/**', route => {
            const name = new URL(route.request().url()).searchParams.get('name');
            return route.fulfill({ json: { results: name === 'invalidxyz123' ? [] : [{ name, latitude: 28.6, longitude: 77.2, country: 'India' }] } });
        });
        await context.route('https://api.open-meteo.com/**', route => {
            assert.ok(new URL(route.request().url()).searchParams.get('current').split(',').includes('is_day'));
            return route.fulfill(apiFailure ? { status: 503, body: '{}' } : { json: apiResponse });
        });
        await page.goto(url);
        await page.waitForFunction(() => document.querySelector('video.is-visible')?.getAttribute('src') === 'assets/Videos/default/default night.mp4');
        assert.ok(requests.filter(request => request.relative.endsWith('.mp4')).every(request => request.relative === 'assets/Videos/default/default night.mp4'));
        assert.equal(await page.locator('.weather-background video').count(), 2);
        assert.equal(await page.locator('.weather-background').getAttribute('aria-hidden'), 'true');
        await page.waitForTimeout(1300);
        async function waitVideo(expected) {
            await page.waitForFunction(expected => {
                const visible = document.querySelector('video.is-visible');
                return visible?.getAttribute('src') === expected && !visible.paused && visible.readyState >= 2 && getComputedStyle(visible).opacity === '1' && document.querySelectorAll('video[src]').length === 1;
            }, expected);
        }
        const defaultDay = 'assets/Videos/default/default day.mp4';
        const defaultNight = 'assets/Videos/default/default night.mp4';
        await waitVideo(defaultNight);
        await page.locator('#theme-toggle').click();
        await waitVideo(defaultDay);
        await page.reload();
        await waitVideo(defaultDay);
        await page.locator('#theme-toggle').click();
        await waitVideo(defaultNight);
        await page.reload();
        await waitVideo(defaultNight);
        // Failed first searches must not move the controller into weather state.
        for (const query of ['invalidxyz123', 'failedfirstcity']) {
            apiFailure = query === 'failedfirstcity';
            await page.locator('#location-input').fill(query);
            await page.locator('#location-input').press('Enter');
            await page.waitForFunction(() => /Location not found|Unable to load/.test(document.querySelector('#status-message').textContent));
            assert.equal(await page.locator('video.is-visible').getAttribute('src'), defaultNight);
        }
        apiFailure = false;
        await page.locator('#theme-toggle').click();
        await waitVideo(defaultDay);
        // Reduced-motion restoration before any result must retain default state.
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForFunction(() => !document.querySelector('video[src]'));
        await page.locator('#theme-toggle').click();
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await waitVideo(defaultNight);
        await page.evaluate(() => { const toggle = document.querySelector('#theme-toggle'); toggle.click(); toggle.click(); toggle.click(); });
        await waitVideo(defaultDay);
        await page.locator('#theme-toggle').click();
        await waitVideo(defaultNight);
        await page.locator('#location-input').fill('Daycity');
        await page.locator('#location-input').press('Enter');
        await page.waitForFunction(() => document.querySelector('#location-name').textContent === 'Daycity');
        await waitVideo('assets/Videos/clear/clear day sky.mp4');
        await page.locator('#theme-toggle').click();
        const time = await page.locator('video.is-visible').evaluate(video => video.currentTime);
        await page.waitForTimeout(500);
        assert.equal(await page.locator('video.is-visible').getAttribute('src'), 'assets/Videos/clear/clear day sky.mp4');
        assert.ok(await page.locator('video.is-visible').evaluate(video => video.currentTime) > time);
        apiResponse.current.weather_code = 63;
        apiResponse.current.is_day = 0;
        await page.locator('#location-input').fill('Nightcity');
        await page.locator('#location-input').press('Enter');
        await page.waitForFunction(() => document.querySelector('#location-name').textContent === 'Nightcity');
        await waitVideo('assets/Videos/rain/rain at night.mp4');
        await page.locator('#theme-toggle').click();
        await page.waitForTimeout(500);
        assert.equal(await page.locator('video.is-visible').getAttribute('src'), 'assets/Videos/rain/rain at night.mp4');
        await page.locator('#location-input').fill('invalidxyz123');
        await page.locator('#location-input').press('Enter');
        await page.waitForFunction(() => document.querySelector('#status-message').textContent.includes('Location not found'));
        assert.equal(await page.locator('video.is-visible').getAttribute('src'), 'assets/Videos/rain/rain at night.mp4');
        await page.reload();
        await waitVideo(defaultNight);
        apiResponse = structuredClone(weather);
        console.log('PASS default day/night startup and refresh, before-search theme crossfades, failed first searches, reduced motion, rapid theme toggles, API daylight overriding theme, unchanged playback after search, and refresh resetting weather state');
        const extraCodes = [[1, 'clear'], [48, 'fog'], [51, 'rain'], [53, 'rain'], [55, 'rain'], [56, 'rain'], [57, 'rain'], [61, 'rain'], [66, 'rain'], [80, 'rain'], [81, 'rain'], [67, 'heavy rain'], [82, 'heavy rain'], [71, 'snow'], [75, 'snow'], [77, 'snow'], [85, 'snow'], [86, 'snow'], [96, 'thunderstorm'], [97, 'thunderstorm'], [99, 'thunderstorm']];
        for (const [code, category] of [...conditions, ...extraCodes]) assert.equal(await page.evaluate(code => WeatherBackground.getWeatherCategory(code), code), category);
        assert.equal(await page.evaluate(() => WeatherBackground.getWeatherVideo(0, undefined)), null);

        async function settle(code, isDay, targetPage = page, fallback = false) {
            const expected = await targetPage.evaluate(({ code, isDay, fallback }) => WeatherBackground.getWeatherVideo(fallback ? -1 : code, isDay), { code, isDay, fallback });
            await targetPage.evaluate(({ code, isDay }) => WeatherBackground.update({ weather_code: code, is_day: isDay }), { code, isDay });
            await targetPage.waitForFunction(expected => {
                const visible = document.querySelector('.weather-background video.is-visible');
                const videos = [...document.querySelectorAll('.weather-background video')];
                return visible?.getAttribute('src') === expected && visible.readyState >= 2 && !visible.paused && getComputedStyle(visible).opacity === '1' && videos.filter(video => video.hasAttribute('src')).length === 1;
            }, expected, { timeout: 30000 });
            return expected;
        }
        // Validate exact case of each path, and play every one of the 18 real assets.
        for (const [code, category] of conditions) {
            for (const isDay of [1, 0]) {
                const expected = await settle(code, isDay);
                let directory = root;
                for (const segment of expected.split('/')) {
                    assert.ok(fs.readdirSync(directory).includes(segment), `Case mismatch: ${expected}`);
                    directory = path.join(directory, segment);
                }
                assert.ok(fs.statSync(directory).size > 0);
                const media = await page.locator('video.is-visible').evaluate(video => ({ muted: video.muted, loop: video.loop, inline: video.playsInline, autoplay: video.autoplay, width: video.videoWidth, time: video.currentTime }));
                assert.ok(media.muted && media.loop && media.inline && media.autoplay && media.width > 0 && media.time > 0);
                assert.equal(await page.locator('video.is-visible').evaluate(video => getComputedStyle(video).filter), 'none');
                if (process.env.VIDEO_VISIBILITY_PREVIEW_DIR) {
                    for (const theme of ['light', 'dark']) {
                        if (await page.evaluate(() => document.body.classList.contains('light-theme')) !== (theme === 'light')) await page.locator('#theme-toggle').click();
                        await page.waitForTimeout(500);
                        await page.screenshot({ path: path.join(process.env.VIDEO_VISIBILITY_PREVIEW_DIR, `${category.replaceAll(' ', '-')}-${isDay ? 'day' : 'night'}-${theme}.png`) });
                    }
                }
                console.log(`PASS real video decoded and playing: ${category}, ${isDay ? 'day' : 'night'} — ${expected}`);
            }
        }
        await settle(0, 1);
        const currentSource = await page.locator('video.is-visible').getAttribute('src');
        const before = requests.filter(request => request.relative.endsWith('.mp4')).length;
        const playbackTime = await page.locator('video.is-visible').evaluate(video => video.currentTime);
        await page.locator('#theme-toggle').click();
        await page.waitForTimeout(500);
        assert.equal(await page.locator('.weather-background__overlay').evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(238, 238, 238, 0.1)');
        await settle(1, 1);
        assert.equal(await page.locator('video.is-visible').getAttribute('src'), currentSource);
        assert.equal(requests.filter(request => request.relative.endsWith('.mp4')).length, before);
        assert.ok(await page.locator('video.is-visible').evaluate(video => video.currentTime) > playbackTime);
        await page.locator('#theme-toggle').click();
        await page.waitForTimeout(500);
        assert.equal(await page.locator('.weather-background__overlay').evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(34, 40, 49, 0.2)');
        console.log('PASS same video is reused; theme overlay changes without media requests or restarting playback');

        async function search(query) {
            await page.locator('#location-input').fill(query);
            await page.locator('#location-input').press('Enter');
            await page.waitForFunction(() => document.querySelector('#status-message').textContent !== 'Loading weather...');
        }
        for (const query of ['', 'invalidxyz123', 'failedcity']) {
            apiFailure = query === 'failedcity';
            await search(query);
            assert.equal(await page.locator('video.is-visible').getAttribute('src'), currentSource);
        }
        apiFailure = false;
        // A held media request proves new weather renders and scrolls independently.
        let release;
        const held = new Promise(resolve => { release = resolve; });
        await page.route('**/assets/Videos/rain/**', async route => { await held; await route.continue().catch(() => {}); });
        apiResponse.current.weather_code = 63;
        await search('Raincity');
        assert.equal(await page.locator('#location-name').textContent(), 'Raincity');
        assert.equal(await page.locator('#temperature').textContent(), '24°C');
        assert.equal(await page.locator('video.is-visible').getAttribute('src'), currentSource);
        assert.equal(await page.locator('video.is-visible').evaluate(video => getComputedStyle(video).opacity), '1');
        release();
        await page.waitForFunction(() => document.querySelectorAll('video.is-visible').length === 2);
        await page.waitForTimeout(200);
        const opacities = await page.locator('video.is-visible').evaluateAll(videos => videos.map(video => Number(getComputedStyle(video).opacity)));
        assert.ok(opacities.includes(1) && opacities.some(value => value > 0 && value < 1));
        await page.unroute('**/assets/Videos/rain/**');
        await settle(63, 1);
        console.log('PASS failed searches preserve video; weather render is independent; old frame stays opaque during preload and crossfade');

        let releaseSlow;
        const slow = new Promise(resolve => { releaseSlow = resolve; });
        await page.route('**/assets/Videos/snow/**', async route => { await slow; await route.continue().catch(() => {}); });
        await page.evaluate(() => WeatherBackground.update({ weather_code: 73, is_day: 1 }));
        await page.waitForFunction(() => [...document.querySelectorAll('video')].some(video => video.getAttribute('src')?.includes('/snow/')));
        await settle(95, 0);
        releaseSlow();
        await page.waitForTimeout(500);
        assert.ok((await page.locator('video.is-visible').getAttribute('src')).includes('thunderstorm night'));
        await page.unroute('**/assets/Videos/snow/**');
        await page.evaluate(() => { WeatherBackground.update({ weather_code: 0, is_day: 1 }); WeatherBackground.update({ weather_code: 45, is_day: 0 }); WeatherBackground.update({ weather_code: 2, is_day: 1 }); });
        await settle(2, 1);
        console.log('PASS late media and rapid consecutive updates cannot replace latest weather');

        // Fresh pages avoid cached media when injecting missing/corrupt/play failures.
        async function failurePage(kind) {
            const target = await context.newPage();
            const warnings = [];
            target.on('pageerror', error => errors.push(error.message));
            target.on('console', message => { if (message.type() === 'warning') warnings.push(message.text()); });
            if (kind === 'play') {
                await target.addInitScript(() => { const original = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function() { return this.src.includes('/rain/') ? Promise.reject(new DOMException('Test autoplay denial', 'NotAllowedError')) : original.call(this); }; });
            } else {
                await target.route('**/assets/Videos/rain/**', route => route.fulfill({ status: kind === 'missing' ? 404 : 200, contentType: 'video/mp4', body: kind === 'missing' ? '' : 'corrupt MP4' }));
            }
            if (kind === 'both') await target.route('**/assets/Videos/default/**', route => route.fulfill({ status: 404, body: '' }));
            await target.goto(url);
            if (kind === 'both') {
                await settle(0, 1, target);
                await target.evaluate(() => WeatherBackground.update({ weather_code: 63, is_day: 0 }));
                await target.waitForFunction(() => !document.querySelector('.weather-background').classList.contains('has-video'));
                assert.equal(await target.locator('video[src]').count(), 0);
                assert.equal(await target.locator('body').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(34, 40, 49)');
            } else await settle(63, 0, target, true);
            assert.ok(warnings.length > 0);
            await target.close();
        }
        for (const kind of ['missing', 'corrupt', 'play', 'both']) { await failurePage(kind); console.log('PASS fallback: ' + kind); }

        for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            await page.waitForTimeout(300);
            const layout = await page.locator('.weather-background').evaluate(el => ({ rect: { width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height }, overflow: document.documentElement.scrollWidth > innerWidth, clicks: getComputedStyle(el).pointerEvents, cover: getComputedStyle(el.querySelector('video')).objectFit }));
            assert.equal(layout.rect.width, width); assert.equal(layout.rect.height, 900);
            assert.equal(layout.overflow, false); assert.equal(layout.clicks, 'none'); assert.equal(layout.cover, 'cover');
            assert.equal(await page.locator('video.is-visible').evaluate(video => getComputedStyle(video).position), 'fixed');
            if (width === 375 && process.env.VIDEO_VISIBILITY_PREVIEW_DIR) {
                await page.waitForTimeout(1200);
                for (const theme of ['light', 'dark']) {
                    if (await page.evaluate(() => document.body.classList.contains('light-theme')) !== (theme === 'light')) await page.locator('#theme-toggle').click();
                    await page.waitForTimeout(500);
                    await page.screenshot({ path: path.join(process.env.VIDEO_VISIBILITY_PREVIEW_DIR, `mobile-${theme}.png`) });
                }
                await page.locator('#weather').evaluate(el => el.scrollIntoView({behavior:'instant'}));
                await page.waitForTimeout(1000);
                await page.screenshot({ path: path.join(process.env.VIDEO_VISIBILITY_PREVIEW_DIR, 'mobile-weather.png') });
                await page.locator('#about').evaluate(el => el.scrollIntoView({behavior:'instant'}));
                await page.waitForTimeout(1000);
                await page.screenshot({ path: path.join(process.env.VIDEO_VISIBILITY_PREVIEW_DIR, 'mobile-about.png') });
                await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));
            }
            if (width < 481) {
                await page.locator('#menu-toggle').click();
                assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'), 'true');
                await page.keyboard.press('Escape');
            }
        }
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForFunction(() => !document.querySelector('video[src]'));
        assert.equal(await page.locator('.weather-background').isVisible(), false);
        const count = requests.filter(request => request.relative.endsWith('.mp4')).length;
        await page.evaluate(() => WeatherBackground.update({ weather_code: 45, is_day: 0 }));
        await page.waitForTimeout(250);
        assert.equal(requests.filter(request => request.relative.endsWith('.mp4')).length, count);
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await settle(45, 0);
        assert.deepEqual(errors, []);
        assert.ok(requests.filter(request => request.relative.endsWith('.mp4')).every(request => request.status === 200 || request.status === 206));
        console.log('PASS eight responsive widths, hamburger/clicks, static reduced-motion mode and latest-weather restoration; no uncaught errors');
        if (process.env.VIDEO_PREVIEW_DIR) {
            await page.setViewportSize({ width: 1440, height: 900 });
            await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
            await settle(2, 1);
            await page.screenshot({ path: path.join(process.env.VIDEO_PREVIEW_DIR, 'video-dark.png') });
            await page.locator('#theme-toggle').click();
            await page.waitForTimeout(500);
            await page.screenshot({ path: path.join(process.env.VIDEO_PREVIEW_DIR, 'video-light.png') });
            await page.setViewportSize({ width: 375, height: 900 });
            await page.waitForTimeout(1400);
            await page.screenshot({ path: path.join(process.env.VIDEO_PREVIEW_DIR, 'video-mobile.png') });
        }
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
