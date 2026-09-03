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
        assert.match(html, /data-smartemr-color-base/);
        assert.match(html, /data-smartemr-color-theme/);
        assert.match(html, /const invertRichNoteColor =/);
        assert.match(html, /const updateRichNoteColorsForTheme =/);
        assert.match(html, /updateRichNoteColorInputForTheme/);
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
        assert.match(html, /portable to an external EMR/);
        assert.match(html, /the treatment goal of \[brief restatement of the goal\]/);
        assert.match(html, /the objective of \[brief restatement of the objective\]/);
        assert.doesNotMatch(html, /Use the identifiers supplied for goals and objectives/);
        assert.match(html, /Suggestions Tone[\s\S]*?evidence-preserving/);
        assert.match(html, /Legacy Instructions \(Review\)/);
        assert.match(html, /Audit-support field mapping/);
    });

    test(`${path} uses evidence-first SOAP generation without fabricated collaboration`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');

        assert.match(html, /const SOAP_GUIDANCE_MIGRATION_VERSION = 1/);
        assert.match(html, /migrateSoapGuidanceOnce\(data\.aiInstructions\)/);
        assert.match(html, /Clinician-Entered Diagnosis \(Treatment Anchor; not evidence of today's symptoms\)/);
        assert.match(html, /Candidate Objectives \(not automatically addressed; choose only when current-session evidence supports them\)/);
        assert.match(html, /Treatment goal: \$\{goal\.title\}/);
        assert.doesNotMatch(html, /const goalRef = `G\$\{goalIndex \+ 1\}`/);
        assert.doesNotMatch(html, /\[\$\{obj\.ref\}\]/);
        assert.match(html, /Do not assume interventions, client participation, response, improvement, impairment, risk status, or medical necessity/);
        assert.match(html, /Do not use a fixed suggestion count/);
        assert.match(html, /const normalizeObjectiveLine =/);
        assert.doesNotMatch(html, /Writer engaged Ct in this intervention/);
        assert.doesNotMatch(html, /with Ct participation/);
        assert.doesNotMatch(html, /assuming interventions when needed/);
    });

    test(`${path} supports a simple editable diagnosis list in Treatment Goals`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');

        assert.match(html, /id="addDiagnosisBtn"/);
        assert.match(html, /id="clientDiagnosesList"/);
        assert.match(html, /const normalizeClientDiagnoses =/);
        assert.match(html, /const addClientDiagnosis =/);
        assert.match(html, /const removeClientDiagnosis =/);
        assert.match(html, /const updateClientDiagnosis =/);
        assert.match(html, /const updateClientDiagnosisSubstantiation =/);
        assert.match(html, /class="client-diagnosis-substantiation"/);
        assert.match(html, /Substantiation/);
        assert.match(html, /substantiation/);
        assert.match(html, /\.client-diagnosis-row \{[\s\S]*?padding: 9px;[\s\S]*?border: 1px solid var\(--panel-border\)/);
        assert.match(html, /Add one diagnosis per row/);
        assert.doesNotMatch(html, /const generateDiagnosticSupportStatements =/);
        assert.doesNotMatch(html, /Consider every diagnosis when developing the presenting problem/);
    });
}
