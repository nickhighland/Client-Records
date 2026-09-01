import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

for (const path of ['index.html', 'src/index.html']) {
    test(`${path} includes rich-note formatting and SOAP icon controls`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');

        assert.match(html, /data-rich-note-command="bold"/);
        assert.match(html, /data-rich-note-command="italic"/);
        assert.match(html, /data-rich-note-command="underline"/);
        assert.match(html, /data-rich-note-color/);
        assert.doesNotMatch(html, /Cmd\/Ctrl\+B bold \| Cmd\/Ctrl\+I italic \| Cmd\/Ctrl\+U underline/);

        assert.match(html, /const SOAP_ICON_SVGS =/);
        assert.match(html, /const renderSoapCopyButton =/);
        assert.match(html, /id="refreshDiagnosticSupportBtn"/);
        assert.match(html, /title="Open Intervention Bank"/);
        assert.doesNotMatch(html, /id="generateInterventionsBtn"[^>]*>Read<\/button>/);
        assert.doesNotMatch(html, /data-target="soapS"[^>]*>Copy<\/button>/);
    });

    test(`${path} explains the SOAP golden thread and evidence boundaries`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');

        assert.match(html, /Follow the golden thread from diagnosis and presenting problem to the active goal\/objective/);
        assert.match(html, /Never fill documentation gaps with assumptions/);
        assert.match(html, /Suggestions Tone[\s\S]*?evidence-preserving/);
        assert.match(html, /Legacy Instructions \(Review\)/);
        assert.match(html, /Audit-support field mapping/);
    });
}
