import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

for (const path of ['index.html', 'src/index.html']) {
    test(`${path} keeps Menu above right-aligned Auto-lock Session`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');

        assert.match(html, /grid-template-areas: "title actions";/);
        assert.match(html, /\.header-actions \{[\s\S]*?flex-direction: column;[\s\S]*?align-items: flex-end;/);
        assert.match(html, /grid-template-areas:\s*"title actions"\s*"columns columns";/);
        const headerCss = html.match(/        \.header \{([\s\S]*?)        \}/)?.[1] || '';
        assert.doesNotMatch(headerCss, /flex-wrap: wrap/);

        const headerActionsIndex = html.indexOf('<div class="header-actions"');
        const menuIndex = html.indexOf('<div class="header-menu"', headerActionsIndex);
        const autoLockIndex = html.indexOf('<div class="autolock-wrapper"', headerActionsIndex);
        assert.ok(headerActionsIndex >= 0 && menuIndex > headerActionsIndex && autoLockIndex > menuIndex);
        assert.match(html, /SmartEMR version 3\.0\.22/);
    });
}
