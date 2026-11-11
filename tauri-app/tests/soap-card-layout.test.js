import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

for (const path of ['index.html', 'src/index.html']) {
    test(`${path} keeps SOAP cards expanded and Interventions and Purpose editable`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');

        assert.match(html, /#soapContent > \.soap-section,[\s\S]*?#soapContent > \.soap-support-block\s*\{[^}]*flex:\s*0 0 auto/);
        assert.match(html, /<textarea id="interventionsAndPurpose" class="soap-textarea soap-support-textarea"/);
        assert.doesNotMatch(html, /<textarea id="interventionsAndPurpose"[^>]*readonly/);
        assert.match(html, /interventionsAndPurpose: 'interventionsAndPurpose'/);
        assert.match(html, /if \(e\.target\.matches\('\.soap-textarea'\)\)/);
    });
}
