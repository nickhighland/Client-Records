import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

for (const path of ['index.html', 'src/index.html']) {
    test(`${path} keeps Menu separate and aligns Auto-lock Session with the column pills`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');

        assert.match(html, /grid-template-areas:\s*"title actions"\s*"utility utility";/);
        assert.match(html, /\.header-actions \{[\s\S]*?flex-direction: column;[\s\S]*?align-items: flex-end;/);
        assert.match(html, /\.header-utility-row \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) max-content;/);
        assert.match(html, /\.header-column-controls \{[\s\S]*?justify-content: flex-start;[\s\S]*?justify-self: start;/);
        assert.match(html, /#autolockWrapper \{[\s\S]*?grid-column: 2;[\s\S]*?justify-self: end;/);
        const headerCss = html.match(/        \.header \{([\s\S]*?)        \}/)?.[1] || '';
        assert.doesNotMatch(headerCss, /flex-wrap: wrap/);

        const headerActionsIndex = html.indexOf('<div class="header-actions"');
        const menuIndex = html.indexOf('<div class="header-menu"', headerActionsIndex);
        const utilityRowIndex = html.indexOf('<div class="header-utility-row"');
        const columnPillsIndex = html.indexOf('<div id="headerColumnControls"', utilityRowIndex);
        const autoLockIndex = html.indexOf('<div class="autolock-wrapper"', utilityRowIndex);
        assert.ok(headerActionsIndex >= 0 && menuIndex > headerActionsIndex);
        assert.ok(utilityRowIndex >= 0 && columnPillsIndex > utilityRowIndex && autoLockIndex > columnPillsIndex);
        assert.match(html, /<title>SmartEMR v3\.0\.24<\/title>/);
        assert.doesNotMatch(html, /class="version-badge"/);
        assert.doesNotMatch(html, /<h1>[\s\S]*?SmartEMR/);
    });
}

test('Tauri window title includes the current SmartEMR version', async () => {
    const config = JSON.parse(await readFile(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'));
    assert.equal(config.app.windows[0].title, 'SmartEMR v3.0.24');
});
