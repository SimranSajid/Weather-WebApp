const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/KIIT/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
    const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
        await require('./alphabet-autocomplete-check.cjs')(page);
        const input = page.locator('#location-input');
        for (const query of ['L', 'Lo', 'Lon', 'London', 'D', 'Delhi', 'India']) {
            await input.fill(query);
            await page.waitForFunction(() => document.querySelectorAll('#location-suggestions [role=option]').length > 0);
            assert.equal(await input.getAttribute('aria-expanded'), 'true');
            console.log('PASS direct HTML autocomplete: ' + query);
        }
        await page.locator('#location-suggestions [role=option]').filter({ hasText: /^India\s*Country$/ }).click();
        await input.fill('Odi');
        await page.locator('#location-suggestions [role=option]').filter({ hasText: 'Odisha' }).click();
        await input.fill('Bhu');
        await page.locator('#location-suggestions [role=option]').filter({ hasText: 'Bhubaneswar' }).waitFor();
        await input.press('Escape');
        await page.locator('#reset-location-context').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await page.locator('#reset-location-context').click();
        assert.equal(await page.locator('#location-suggestions').isVisible(), false);
        assert.deepEqual(errors, []);
        console.log('PASS direct HTML country/state filtering, reset, and console');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
