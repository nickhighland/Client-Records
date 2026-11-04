import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

for (const path of ['index.html', 'src/index.html']) {
    test(`${path} keeps diagnostic support and medical necessity chart-ready`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');

        assert.match(html, /const fetchSessionFocusFromAI =/);
        assert.match(html, /const fetchDiagnosticSupportFromAI =/);
        assert.match(html, /const fetchMedicalNecessityFromAI =/);
        assert.match(html, /const normalizeDiagnosticSupportFromAi = \(aiPayload\) => \{/);
        assert.match(html, /const normalizeDiagnosticSupportReferences = \(value, client\) =>/);
        assert.match(html, /refer to the client as "Ct" and the clinician as "Writer"/);
        assert.match(html, /Never write "the client," "client," "the clinician," or "clinician"/);
        assert.match(html, /normalizeDiagnosticSupportReferences\(supportFields\.diagnosticSupport, client\)/);
        assert.match(html, /const rawSentences = Array\.isArray\(item\.sentences\)/);
        assert.match(html, /Each entry must contain a sentences array with 3-4 concise, complete sentences/);
        assert.match(html, /If no specific evidence appeared in the session, omit the evidence sentence/);
        assert.match(html, /separate 3-4 sentence section for each diagnosis/);
        assert.doesNotMatch(html, /no diagnosis-specific support was documented for that diagnosis/);
        assert.match(html, /const normalizeSoapSessionFocusFromAi =/);
        assert.match(html, /const normalizeCoupleCollectiveReferences =/);
        assert.match(html, /Couple Collective Grammar/);
        assert.match(html, /Never write "Ct\\'s" for a couple/);
        assert.match(html, /combine the documented presenting problem with the clinical problem evidenced/);
        assert.match(html, /Do not return intervention selections, Session Focus, Diagnostic Support, or Medical Necessity/);
        assert.match(html, /Never say the record is insufficient to substantiate a diagnosis/);
        assert.match(html, /Do not evaluate whether criteria are met/);
        assert.match(html, /ongoing skilled treatment remains medically necessary/);
        assert.match(html, /id="refreshSessionFocusBtn"/);
        assert.match(html, /id="refreshDiagnosticSupportBtn"/);
        assert.match(html, /id="refreshMedicalNecessityBtn"/);

        const planIndex = html.indexOf('id="soapP"');
        const presentingProblemIndex = html.indexOf('id="soapClientPresentingProblem"');
        const sessionFocusIndex = html.indexOf('id="sessionFocus"');
        const diagnosticSupportIndex = html.indexOf('id="diagnosticSupport"');
        const medicalNecessityIndex = html.indexOf('id="medicalNecessity"');
        assert.ok(planIndex >= 0 && planIndex < presentingProblemIndex);
        assert.ok(presentingProblemIndex < sessionFocusIndex);
        assert.ok(sessionFocusIndex < diagnosticSupportIndex);
        assert.ok(diagnosticSupportIndex < medicalNecessityIndex);
        assert.match(html, /key: 'presentingProblem', label: 'Presenting Problem', description: 'The Presenting Problem copied directly from the client’s Treatment Goals record\.'/);
        assert.match(html, /appointment\.soap\.clientPresentingProblem = String\(client\?\.presentingProblem \|\| ''\)/);
        assert.match(html, /appointment\.soap\.sessionFocus = normalizeCoupleCollectiveReferences\(supportFields\.sessionFocus, client\)/);
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
