import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

for (const path of ['index.html', 'src/index.html']) {
    test(`${path} keeps diagnostic support and medical necessity chart-ready`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');

        assert.match(html, /const fetchDiagnosticSupportFromAI =/);
        assert.match(html, /const fetchMedicalNecessityFromAI =/);
        assert.match(html, /Never say the record is insufficient to substantiate a diagnosis/);
        assert.match(html, /Do not evaluate whether criteria are met/);
        assert.match(html, /ongoing skilled treatment remains medically necessary/);
        assert.match(html, /id="refreshDiagnosticSupportBtn"/);
        assert.match(html, /id="refreshMedicalNecessityBtn"/);

        const planIndex = html.indexOf('id="soapP"');
        const diagnosticSupportIndex = html.indexOf('id="diagnosticSupport"');
        const medicalNecessityIndex = html.indexOf('id="medicalNecessity"');
        assert.ok(planIndex >= 0 && planIndex < diagnosticSupportIndex);
        assert.ok(diagnosticSupportIndex < medicalNecessityIndex);
        assert.match(html, /\.soap-support-block \{[\s\S]*?border: 1px solid #0f766e/);
        assert.match(html, /background: linear-gradient\(135deg, #0f766e 0%, #0d9488 100%\)/);
    });

    test(`${path} scopes intervention-bank entries to the client session type`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');

        assert.match(html, /id="clientSessionTypeSelect"/);
        assert.match(html, /id="newInterventionCouplesOnly"/);
        assert.match(html, /class="intervention-couples-only-toggle"/);
        assert.match(html, /const isInterventionAllowedForClient =/);
        assert.match(html, /const getInterventionBankEntriesForClient =/);
        assert.match(html, /getInterventionBankContext\(client\)/);
        assert.match(html, /getInterventionContext\(appointment, client\)/);
        assert.doesNotMatch(html, /getInterventionContext\(appointment\);/);
        assert.match(html, /Couples only/);
    });
}
