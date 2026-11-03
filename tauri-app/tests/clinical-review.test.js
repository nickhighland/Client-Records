import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeClinicalReview, verifyClinicalCandidate, markClinicalDependencies, confirmedClinicalContext,
    normalizeNecessity, CLINICAL_REVIEW_INSTRUCTIONS, GOLDEN_THREAD_INSTRUCTIONS, prepareClinicalGeneration } from '../src/soap-clinical-review.js';

const shorthand = 'Discussed guilt, boundaries, childhood expectations, and difficulty disappointing others.';
const make = () => {
    const payload = { o: 'Writer explored guilt and boundaries.', objective_items: [{ id: 'E1', text: 'Writer explored guilt and boundaries.',
        evidence_category: 'direct', source_quote: shorthand }], clinical_suggestions: [
        { id: 'C1', text: 'Writer utilized narrative externalization to explore compliance.', evidence_category: 'hypothesis',
            source_quote: shorthand, technique: 'NT: Externalization', rationale: 'A possible narrative technique; verify delivery.' }
    ], a: 'Ct demonstrated reduced symptoms.', statement_dependencies: { a: [{ text: 'Ct demonstrated reduced symptoms.', evidence_ids: ['C1'] }] } };
    return { payload, state: initializeClinicalReview(payload, shorthand, 'generation-1') };
};

test('A/D: shorthand permits direct exploration but specific technique and unsupported response require review', () => {
    const { payload, state } = make();
    assert.match(payload.o, /explored guilt/);
    assert.doesNotMatch(payload.o, /externalization/);
    assert.equal(payload.a, '');
    assert.equal(state.candidates.find(item => item.id === 'C1').verificationStatus, 'pending');
    assert.equal(state.candidates.find(item => item.targetField === 'a').verificationStatus, 'pending');
    assert.match(CLINICAL_REVIEW_INSTRUCTIONS, /Proactively suggest/);
});

test('E: rejected inference is excluded from downstream factual context and cannot be implicitly accepted', () => {
    const { payload, state } = make();
    verifyClinicalCandidate(state, 'C1', 'reject');
    assert.equal(verifyClinicalCandidate(state, 'C1', 'accept'), null);
    const context = JSON.parse(confirmedClinicalContext({ ...payload, clinicalReview: state }));
    assert.equal(context.evidence.length, 1);
    assert.deepEqual(context.excludedCandidateIds.slice(0, 1), ['C1']);
    assert.doesNotMatch(JSON.stringify(context.evidence), /externalization/);
    assert.deepEqual(Object.keys(state.audit[0]).sort(), ['action', 'at', 'candidateId']);
});

test('G: edited candidates remain pending until explicitly approved; classification is retained', () => {
    const { payload, state } = make();
    assert.equal(verifyClinicalCandidate(state, 'C1', 'edit', ''), null);
    assert.equal(state.candidates[0].verificationStatus, 'pending');
    const item = verifyClinicalCandidate(state, 'C1', 'edit', 'Writer used externalization to explore compliance.');
    assert.equal(item.evidenceCategory, 'hypothesis');
    assert.equal(item.verificationStatus, 'confirmed');
    payload.o += `\n• ${item.text}`;
    assert.equal(JSON.parse(confirmedClinicalContext({ ...payload, clinicalReview: state })).evidence.length, 2);
});

test('H: removing a confirmed intervention flags dependent text without overwriting clinician edits', () => {
    const { payload, state } = make();
    const soap = { ...payload, a: 'Clinician edited interpretation.', medicalNecessity: 'Clinician edited rationale.', clinicalReview: state };
    state.dependencies = { a: [{ text: soap.a, evidence_ids: ['E1'] }] };
    markClinicalDependencies(soap, soap.o, '• Other intervention');
    assert.equal(soap.a, 'Clinician edited interpretation.');
    assert.equal(soap.medicalNecessity, 'Clinician edited rationale.');
    assert.equal(state.consistency.status, 'review_required');
    assert.equal(state.affectedStatements[0].field, 'a');
});

test('F: insufficient or malformed medical necessity responses cannot become unconditional statements', () => {
    assert.equal(normalizeNecessity('Ongoing treatment is medically necessary.').statement, '');
    assert.equal(normalizeNecessity({ status: 'review_required', statement: 'Unsupported claim', missing_documentation: ['Describe functional concerns.'] }).statement, '');
    assert.equal(normalizeNecessity({ status: 'supported', statement: 'Evidence-supported rationale.' }).statement, 'Evidence-supported rationale.');
    const supported = { status: 'supported', statement: 'Skilled care remains necessary for documented continuing anxiety-related work impairment.',
        supporting_sources: [{ source: 'longitudinal', quote: 'Anxiety continues to impair work attendance.' }] };
    assert.equal(normalizeNecessity(supported, { current: [], longitudinal: ['Anxiety continues to impair work attendance.'] }).status, 'supported');
    assert.equal(normalizeNecessity(supported, { current: ['Different session'], longitudinal: [] }).status, 'review_required');
});

test('B/C: complementary mapping retains separate clinical events and requires approval for consolidation', () => {
    const source = 'Explored successful boundary-setting moment. Used scaffolding questions to examine what Ct did. Assessed cannabis use patterns. Explored dating anxiety. Reviewed treatment progress.';
    const statements = source.split('. ').map(s => s.replace(/\.$/, ''));
    const payload = { objective_items: statements.map((value, index) => ({ id: `E${index}`, text: value,
        evidence_category: 'direct', source_quote: value })) };
    const state = initializeClinicalReview(payload, source, 'B-C');
    assert.equal(state.evidence.length, 5);
    assert.equal(payload.o.split('\n').length, 5);
    assert.match(GOLDEN_THREAD_INSTRUCTIONS, /Preserve these relationships.*during consolidation/);
});

test('I: every provider response uses the same fail-closed evidence/verification normalizer', () => {
    for (const provider of ['openai', 'openwebui', 'ollama', 'vertex']) {
        const payload = { o: 'Writer used a specific technique.', clinical_suggestions: [] };
        const state = initializeClinicalReview(payload, 'Discussed boundaries.', provider);
        assert.equal(payload.o, '');
        assert.equal(state.candidates.length, 1);
        assert.equal(state.candidates[0].verificationStatus, 'pending');
    }
});

test('unsupported source quotes cannot turn a technique hypothesis into direct evidence', () => {
    const payload = { objective_items: [{ id: 'bad', text: 'Writer performed exposure.', evidence_category: 'direct', source_quote: 'Performed exposure.' }] };
    const state = initializeClinicalReview(payload, shorthand, 'bad-source');
    assert.equal(payload.o, '');
    assert.equal(state.candidates[0].sourceVerified, false);
});

test('direct session facts support Assessment without becoming intervention bullets', () => {
    const source = 'Ct reported continuing anxiety at work.';
    const payload = { session_evidence: [{ id: 'F1', text: source, source_quote: source, evidence_category: 'direct' }],
        a: 'Work-related anxiety remains a treatment concern.', statement_dependencies: { a: [{ text: 'Work-related anxiety remains a treatment concern.', evidence_ids: ['F1'] }] } };
    const state = initializeClinicalReview(payload, source, 'facts');
    assert.equal(payload.o, '');
    assert.match(payload.a, /remains a treatment concern/);
    assert.equal(JSON.parse(confirmedClinicalContext({ ...payload, clinicalReview: state })).evidence[0].id, 'F1');
});

test('formulation approval goes to Assessment and does not confirm an intervention or response', () => {
    const payload = { clinical_suggestions: [{ id: 'F1', text: 'Guilt may relate to internalized expectations.', candidate_kind: 'formulation', evidence_category: 'inferred', source_quote: shorthand }] };
    const state = initializeClinicalReview(payload, shorthand, 'formulation');
    const item = verifyClinicalCandidate(state, 'F1', 'accept');
    assert.equal(item.targetField, 'a');
    assert.equal(payload.o, '');
    assert.equal(state.progressClassification, 'insufficient_information');
    assert.equal(JSON.parse(confirmedClinicalContext({ ...payload, clinicalReview: state })).evidence.length, 0);
});

test('regeneration preserves manual edits and confirmed statements and excludes rejected output', () => {
    const { payload, state } = make();
    const confirmed = verifyClinicalCandidate(state, 'C1', 'edit', 'Writer used externalization to explore compliance.');
    payload.o += `\n• ${confirmed.text}`;
    state.manualEdits = { p: true, medicalNecessity: true };
    state.candidates.push({ id: 'rejected', text: 'Writer performed cognitive reframing.', targetField: 'o', verificationStatus: 'rejected' });
    const prior = { ...payload, p: 'Clinician agreed next step.', medicalNecessity: 'Clinician edited rationale.', clinicalReview: state };
    const response = { s: 'Report', o: 'Writer performed cognitive reframing.', a: '', p: 'AI replacement', objective_items: [{ id: 'new', text: 'Writer performed cognitive reframing.', evidence_category: 'direct', source_quote: shorthand }] };
    const next = prepareClinicalGeneration(response, shorthand, 'new-generation', prior);
    assert.equal(next.payload.p, prior.p);
    assert.equal(next.payload.medicalNecessity, prior.medicalNecessity);
    assert.match(next.payload.o, /externalization/);
    assert.doesNotMatch(next.payload.o, /cognitive reframing/);
    assert.equal(response.p, 'AI replacement');
    assert.equal(next.state.candidates.filter(item => item.verificationStatus === 'confirmed').length, 1);
});

test('incomplete provider response leaves the previous note intact', () => {
    const prior = { o: 'Original valid note', clinicalReview: { manualEdits: { o: true } } };
    const snapshot = JSON.stringify(prior);
    assert.throws(() => prepareClinicalGeneration({ o: 'Incomplete replacement' }, shorthand, 'invalid', prior), /retained/);
    assert.equal(JSON.stringify(prior), snapshot);
});

for (const file of ['index.html', 'src/index.html']) {
    const html = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    const declaration = name => {
        const start = html.indexOf(`const ${name} =`);
        return html.slice(start, html.indexOf('\n            const ', start + 1));
    };
    const normalize = new Function(`${declaration('normalizeObjectiveRedundancyLabel')}\n${declaration('normalizeObjectiveRedundancyGroupsFromAi')}\nreturn normalizeObjectiveRedundancyGroupsFromAi;`)();
    test(`${file}: historical context uses only earlier drafts explicitly reviewed at their current revision`, () => {
        const history = new Function(`${declaration('getReviewedLongitudinalContext')}\nreturn getReviewedLongitudinalContext;`)();
        const note = (id, date, a, state) => ({ id, date, soap: { a, clinicalReview: state } });
        const client = { appointments: [
            note('old', '2026-10-01', 'Historical reviewed progress.', { reviewedAt: '2026-10-01', reviewedRevision: 2, noteRevision: 2 }),
            note('unreviewed', '2026-10-02', 'Unverified AI progress.', { noteRevision: 0 }),
            note('edited', '2026-10-03', 'Changed after review.', { reviewedAt: '2026-10-03', reviewedRevision: 1, noteRevision: 2 }),
            note('future', '2026-12-01', 'Future session.', { reviewedAt: '2026-12-01', reviewedRevision: 1, noteRevision: 1 })
        ] };
        const context = history(client, { id: 'now', date: '2026-11-03' });
        assert.match(context, /Historical reviewed progress/);
        assert.doesNotMatch(context, /Unverified|Changed after|Future session/);
        assert.match(context, /not evidence of today/);
    });
    test(`${file}: complementary proposal preserves both original selections until individually approved`, () => {
        const items = [{ id: 'O1', kind: 'objective', text: 'Explored successful boundary-setting moment.' },
            { id: 'O2', kind: 'objective', text: 'Used scaffolding questions about what Ct did.' }];
        const [group] = normalize(items, { redundancy_groups: [{ classification: 'complementary', item_ids: ['O1', 'O2'], recommended_keep_ids: ['O1'],
            proposed: 'Writer used scaffolding questions to explore Ct’s successful boundary-setting actions.' }] });
        assert.equal(group.classification, 'complementary');
        assert.deepEqual(group.selectedItemIndexes, [0, 1]);
        assert.match(group.proposed, /scaffolding/);
        assert.deepEqual(normalize(items, { redundancy_groups: [] }), []);
    });
    test(`${file}: inferred candidates cannot enter via grouping checkboxes`, () => {
        const items = [{ id: 'O1', kind: 'objective' }, { id: 'S1', kind: 'suggestion' }];
        const [group] = normalize(items, { redundancy_groups: [{ classification: 'complementary', item_ids: ['O1', 'S1'], proposed: 'Unverified consolidation' }] });
        assert.equal(group.proposed, '');
    });
    for (const provider of ['openai', 'openwebui', 'ollama', 'vertex']) {
        test(`${file}: ${provider} adapter carries evidence rules and preserves structured candidate responses`, async () => {
            let requested;
            const body = { clinical_suggestions: [{ id: 'C1', text: 'Writer used externalization.', candidate_kind: 'intervention', evidence_category: 'hypothesis', source_quote: 'Discussed boundaries.' }] };
            const reply = { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(body) } }], candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }] }) };
            const send = async (_url, options) => { requested = JSON.parse(options.body); return reply; };
            const vertex = async options => { requested = options.payload; return { response: reply, location: 'global' }; };
            const request = new Function('apiProvider', 'tauriFetch', 'requestVertexGenerateContent', 'GOLDEN_THREAD_INSTRUCTIONS', `
                const selectedModel='fixture-model', openaiApiKey='fixture', serverAddress='http://fixture', apiKey='fixture';
                const ollamaAddressInput={value:'http://fixture'}, vertexServiceAccount='{"project_id":"fixture"}', vertexLocation='global';
                const getGoogleAccessToken=async()=> 'fixture'; const rememberVertexEffectiveLocation=()=>{}; const extractJsonObject=JSON.parse;
                ${declaration('requestJsonObjectFromCurrentProviderImpl')}
                return requestJsonObjectFromCurrentProviderImpl;
            `)(provider, send, vertex, GOLDEN_THREAD_INSTRUCTIONS);
            const result = await request(CLINICAL_REVIEW_INSTRUCTIONS, 'Discussed boundaries.');
            assert.deepEqual(result, body);
            const prompt = JSON.stringify(requested);
            assert.match(prompt, /golden-thread clinical mapping/);
            assert.match(prompt, /Each claim needs its own evidence/);
            const state = initializeClinicalReview(result, 'Discussed boundaries.', provider);
            assert.equal(state.candidates[0].verificationStatus, 'pending');
            assert.equal(result.o, '');
        });
    }
    test(`${file}: copying reviews stale content and copies only the current Objective text`, async () => {
        const { payload, state } = make();
        const appointment = { soap: { ...payload, clinicalReview: state } };
        const start = html.indexOf("soapContentEl.addEventListener('click', async");
        const end = html.indexOf('const handleSuggestion =', start);
        const handlerSource = html.slice(start, end);
        const run = new Function('appointment', 'validationSucceeds', `
            let handler, copied = null, reviews = 0;
            const soapContentEl = { addEventListener: (_type, callback) => { handler = callback; } };
            const context = { appointment }; const getSelectedAppointmentContext = () => context;
            const getAppointmentFromContext = () => appointment; const isCurrentAppointmentContext = () => true;
            const validateClinicalNote = async () => { reviews++; if (validationSucceeds) appointment.soap.clinicalReview.consistency.status = 'checked'; };
            const navigator = { clipboard: { writeText: async value => { copied = value; } } };
            const document = { getElementById: () => ({ value: appointment.soap.o }) };
            const SOAP_ICON_SVGS = { check: 'check' }; const setTimeout = () => {}; const confirm = () => true;
            const button = { id:'copyObjective', dataset:{ target:'soapO' }, classList:{ contains: value => value === 'copy-btn' },
                innerHTML:'Copy', isConnected:true, getAttribute: () => 'Copy Objective', setAttribute: () => {} };
            button.closest = () => button;
            ${handlerSource}
            return handler({ target:button }).then(() => ({ copied, reviews }));
        `);
        const failed = await run(appointment, false);
        assert.equal(failed.copied, null);
        const passed = await run(appointment, true);
        assert.equal(passed.reviews, 1);
        assert.equal(passed.copied, payload.o);
        assert.doesNotMatch(passed.copied, /externalization|confirmed|pending|C1/);
    });
}
