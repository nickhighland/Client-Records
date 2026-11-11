import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

for (const path of ['index.html', 'src/index.html']) {
    test(`${path} includes editable progress for each active goal and objective`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');

        assert.match(html, /key: 'treatmentGoalProgress', label: 'Treatment Goal Progress'/);
        assert.match(html, /const getTreatmentGoalProgressItems =/);
        assert.match(html, /const renderTreatmentGoalProgressItems =/);
        assert.match(html, /Goal \/ Objective Addressed:/);
        assert.match(html, /Improved/);
        assert.match(html, /Partially Improved/);
        assert.match(html, /Unchanged/);
        assert.match(html, /Worsened/);
        assert.match(html, /Insufficient Information/);
        assert.match(html, /soap-treatment-goal-evidence/);
        assert.match(html, /const saveTreatmentGoalProgressField =/);
        assert.match(html, /treatmentGoalProgress\[itemId\] = entry/);
    });

    test(`${path} copies the configured SOAP note as one plain-text block`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');

        assert.match(html, /id="copyAllSoapBtn"/);
        assert.match(html, /const buildCompleteSoapNoteCopyText =/);
        assert.match(html, /buildSoapCopySectionBlocks\([\s\S]*?getSoapPlatformSectionKeysForAppointment\(client, appointment\)/);
        assert.match(html, /copyAllSoapBtn\?\.addEventListener\('click', \(\) => void copyCompleteSoapNote\(\)\)/);
    });
}
