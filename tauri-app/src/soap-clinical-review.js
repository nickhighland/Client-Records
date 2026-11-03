const text = value => String(value ?? '').trim();
const lines = value => text(value).split(/\n+/).map(line => line.replace(/^•\s*/, '').trim()).filter(Boolean);
const bulletText = values => values.filter(Boolean).map(value => `• ${value}`).join('\n');
const key = value => text(value).replace(/^•\s*/, '').replace(/\s+/g, ' ').toLowerCase();
const sourceKey = value => {
    let a = 2166136261, b = 5381;
    for (const char of text(value)) { a = Math.imul(a ^ char.charCodeAt(0), 16777619); b = Math.imul(b, 33) ^ char.charCodeAt(0); }
    return `${text(value).length}:${a >>> 0}:${b >>> 0}`;
};

export const GOLDEN_THREAD_INSTRUCTIONS = `
Locked golden-thread clinical mapping: diagnosis -> documented presenting problem -> active treatment goal/objective -> session evidence -> documented or clinician-confirmed intervention -> documented Ct response -> symptom/function change -> progress/barriers -> medical necessity -> next step.
This is an internal conceptual relationship, not a required written sequence. Never fabricate missing links or block approval solely for an absent conceptual link. Each substantive intervention should concisely express the skilled action, target and therapeutic purpose when supported. Do not invent rationale for reimbursement. Preserve these relationships and documented responses during consolidation.
Map interventions internally to zero, one or multiple actual active objectives with supporting evidence and direct/confirmed/pending status. Shared keywords, diagnosis or modality alone do not justify a link. An inferred connection is a goal_alignment candidate requiring explicit confirmation. Return clinical_links:[{evidence_id,objective_text,source_quote,relationship,evidence_category}] only for supported relationships; use clinical_suggestions for inferred links.
Assessment synthesizes the relationship of documented concerns, diagnosis, interventions, responses, functioning and continuing needs. Distinguish demonstrated progress, emerging adaptive behavior, insight without behavioral change, persistent barriers, and insufficient information. Insight or one successful boundary event does not establish symptom reduction.
Plan follows documented current findings and agreed next steps. Do not automatically turn a session intervention into a future commitment. Suggest clarification when next steps are missing. Never force plan alignment or repeat every golden-thread element in every section.
Final whole-note validation must identify unclear clinical relevance, unsupported objective links, progress without evidence, inconsistent Assessment, unsupported medical necessity, disconnected or invented plans, contradictions and unverified interventions treated as delivered. Offer targeted revisions, preserve clinician edits, and never auto-fill clinical gaps.
`;

export const CLINICAL_REVIEW_INSTRUCTIONS = `
${GOLDEN_THREAD_INSTRUCTIONS}
Clinical interpretation and verification contract (applies to every provider):
Generate intelligently, verify clinically, and finalize conservatively.
Interpret abbreviated session notes using diagnosis, presenting problem, active goals, modality and the intervention bank. Proactively suggest plausible interventions without requiring technique names in the shorthand.
Classify Objective items as direct (Level 1: explicitly documented or faithful restatement), inferred (Level 2: plausible clinical interpretation), or hypothesis (Level 3: a specific technique requiring confirmation).
Distinguish candidate_kind: intervention, formulation, observation, clarification, editorial. A formulation is a tentative relationship or mechanism for Assessment, not proof Writer performed an intervention. Confirming an intervention never confirms its associated formulations, Ct response, progress, symptom reduction, functional improvement or medical necessity. Each claim needs its own evidence. Do not expand faithful restatements with undocumented causal effects. Rank candidates by plausibility, clinical relevance, modality fit, specificity and added value. Prefer about 2–4 worthwhile initial candidates without padding. Minor editorial improvements that introduce no clinical claims may be made in the supported draft.
Assessment is concise synthesis, not repetition. Return progress_classification as demonstrated_improvement, emerging_behavior, insight, persistent_barriers, worsening, no_documented_change or insufficient_information. Do not equate insight or a single successful event with sustained/generalized improvement. Internally distinguish progress today, verified multi-session progress, historical context, and unknown current status.
Current-session information establishes what happened today. Use explicitly clinician-reviewed historical context only for continuity; do not clone previous progress language or infer remission from silence. Chart context is locally maintained and may differ from the destination EHR. Summarize relevant clinical information without unnecessary third-party identifiers, intimate disclosures or quotations. This output is a reviewed draft for transfer, not an authenticated record or reimbursement guarantee.
Only direct items may enter o. Inferred and hypothesis items belong exclusively in clinical_suggestions, never in s, o, a, p or their ordinary suggestions as completed interventions. A preferred modality, diagnosis, goal or previous intervention selection is not proof of delivery.
Never invent Ct statements, responses, observed behavior, symptom severity, impairment, risk assessments, progress or outcomes. Exploring a possible mechanism does not establish that mechanism; supported Assessment interpretations must retain uncertainty.
Prioritize skilled therapeutic work, goal-linked interventions, mechanisms and relational patterns, followed by documented Ct responses and observations. Preserve specific narrative/psychodynamic terminology when supported. Prefer about 3–5 substantive Objective bullets when appropriate, independent of psychotherapy duration or billing code, without fabricating to a minimum or omitting important work to a maximum.
Do not produce suggestions to meet a quota. Suggest only useful additions, clarification, missing documentation, or treatment-plan linkage. Missing documentation recommendations must ask for review rather than assert a fact.
In addition to s,o,a,p and the ordinary suggestion arrays, return:
"objective_items":[{"id":"E1","text":"direct Objective statement","evidence_category":"direct","source_quote":"exact excerpt from Session Information","temporal_context":"current","topic":"...","technique":"...","treatment_objective":"..."}],
"session_evidence":[{"id":"F1","text":"original clinical fact","evidence_category":"direct","source_quote":"exact session excerpt","temporal_context":"current"}],
"clinical_suggestions":[{"id":"C1","text":"proposed statement or documentation question","candidate_kind":"intervention|formulation|observation|clarification|editorial","suggestion_type":"intervention|clarification|documentation_gap|goal_alignment","evidence_category":"inferred|hypothesis","source_quote":"exact supporting session excerpt","technique":"...","treatment_objective":"exact related objective text if applicable","rationale":"brief explanation","evidence_ids":["E1"]}],
"statement_dependencies":{"a":[{"text":"exact Assessment bullet","evidence_ids":["E1"]}] }.
Each Objective bullet must have an objective_items entry and a source quote. Use unique evidence IDs, the original session text as source, and retain temporal context. Do not cite generated SOAP as original evidence. Dependencies may also cover s and p. All inference candidates require individual clinician approval. Do not include unconfirmed interpretations indirectly in Assessment or ordinary suggestions.
Keep the core response keys and JSON-only contract. Preserve Writer/Ct, assigned names/pronouns and platform configuration. Support fields are still generated only after Organize.
`;

export const MEDICAL_NECESSITY_INSTRUCTIONS = `Medical Necessity is conditional, not an automatic conclusion. Use clinician-entered diagnoses, documented current symptoms/function, explicitly labelled longitudinal findings, treatment targets, skilled care requirements, progress/barriers and continuing need. Distinguish current from historical evidence. Diagnosis or note generation alone is insufficient. Never manufacture findings for reimbursement. Return medical_necessity as {"status":"supported|review_required","statement":"one concise sentence, ideally 25–45 words, at most 55, or empty if insufficient","supporting_sources":[{"source":"current|longitudinal","quote":"exact excerpt from verified source material"}],"missing_documentation":["specific information requiring clinician review"]}. Only use supported when the supplied record establishes continuing clinical need and why skilled treatment is required, with matching source quotes. Otherwise leave statement empty and request review. Use Ct/Writer and configured pronouns.`;

export function initializeClinicalReview(payload, sessionInfo, generationId) {
    const source = text(sessionInfo);
    const evidence = [];
    const candidates = [];
    const ids = new Set();
    const uniqueId = requested => {
        let id = text(requested) || `E${ids.size + 1}`;
        while (ids.has(id)) id += '_';
        ids.add(id);
        return id;
    };
    const add = (raw, forceCandidate = false) => {
        const proposed = text(raw?.text || raw?.suggested);
        if (!proposed) return;
        const quote = text(raw.source_quote);
        const category = ['direct', 'inferred', 'hypothesis'].includes(raw.evidence_category) ? raw.evidence_category : 'inferred';
        const grounded = Boolean(quote && source.includes(quote));
        const item = {
            id: uniqueId(raw.id), text: proposed, sourceQuote: grounded ? quote : '',
            source: 'sessionInfo', temporalContext: text(raw.temporal_context) || 'current',
            evidenceCategory: category, technique: text(raw.technique), topic: text(raw.topic),
            candidateKind: ['intervention', 'formulation', 'observation', 'clarification', 'editorial'].includes(raw.candidate_kind) ? raw.candidate_kind : 'intervention',
            targetField: raw.candidate_kind === 'formulation' ? 'a' : (raw.targetField || 'o'),
            treatmentObjective: text(raw.treatment_objective), rationale: text(raw.rationale),
            suggestionType: text(raw.suggestion_type) || 'intervention',
            verificationStatus: !forceCandidate && category === 'direct' && grounded ? 'direct' : 'pending',
            sourceVerified: grounded, evidenceIds: Array.isArray(raw.evidence_ids) ? raw.evidence_ids.map(text) : []
        };
        if (item.targetField === 'context' && item.verificationStatus === 'pending') item.suggestionType = 'documentation_gap';
        if (item.verificationStatus === 'direct') evidence.push(item);
        else candidates.push(item);
    };
    (Array.isArray(payload.objective_items) ? payload.objective_items : []).forEach(item => add(item));
    // Legacy/malformed provider responses fail into review, not confirmed technique delivery.
    const represented = new Set([...evidence, ...candidates].map(item => key(item.text)));
    lines(payload.o).forEach(value => {
        if (!represented.has(key(value))) add({ text: value, rationale: 'Source classification requires clinician review.' });
    });
    (Array.isArray(payload.clinical_suggestions) ? payload.clinical_suggestions : []).forEach(item => add(item, true));
    // Objective additions from older response shapes also require individual confirmation.
    (Array.isArray(payload.o_suggestion) ? payload.o_suggestion : []).forEach(item => {
        const raw = typeof item === 'string' ? { text: item } : { ...item, text: item.suggested || item.text };
        if (![...evidence, ...candidates].some(existing => key(existing.text) === key(raw.text))) add(raw, true);
    });
    (Array.isArray(payload.session_evidence) ? payload.session_evidence : []).forEach(item => add({ ...item, targetField: 'context' }));
    const eligibleIds = new Set(evidence.map(item => item.id));
    const assessmentDependencies = Array.isArray(payload.statement_dependencies?.a) ? payload.statement_dependencies.a : [];
    const supportedAssessment = [];
    lines(payload.a).forEach(statement => {
        const dependency = assessmentDependencies.find(item => key(item.text) === key(statement));
        if (dependency?.evidence_ids?.length && dependency.evidence_ids.every(id => eligibleIds.has(id))) supportedAssessment.push(statement);
        else add({ text: statement, targetField: 'a', candidate_kind: 'formulation', suggestion_type: 'assessment', evidence_category: 'inferred',
            rationale: 'Assessment interpretation requires confirmation of its supporting evidence.' }, true);
    });
    (payload.a_suggestion || []).forEach(item => add({ text: typeof item === 'string' ? item : item.suggested,
        targetField: 'a', candidate_kind: 'formulation', suggestion_type: 'assessment', evidence_category: 'inferred', rationale: 'Review Assessment wording and its evidence.' }, true));
    payload.a = bulletText(supportedAssessment);
    payload.a_suggestion = [];
    payload.o = bulletText(evidence.filter(item => item.targetField === 'o').map(item => item.text));
    payload.o_suggestion = [];
    const links = (Array.isArray(payload.clinical_links) ? payload.clinical_links : [])
        .filter(link => evidence.some(item => item.id === link.evidence_id) && link.evidence_category === 'direct'
            && text(link.source_quote) && source.includes(text(link.source_quote)))
        .map(link => ({ ...link, verificationStatus: 'direct' }));
    return { version: 1, generationId, evidence, candidates, links, audit: [], sourceKey: sourceKey(source),
        noteRevision: 0, progressClassification: ['demonstrated_improvement', 'emerging_behavior', 'insight', 'persistent_barriers', 'worsening', 'no_documented_change', 'insufficient_information'].includes(payload.progress_classification) ? payload.progress_classification : 'insufficient_information',
        dependencies: payload.statement_dependencies || {}, consistency: { status: 'review_required', issues: [] } };
}

export function verifyClinicalCandidate(state, id, action, editedText, now = new Date().toISOString()) {
    const item = state?.candidates.find(candidate => candidate.id === id);
    if (!item || item.verificationStatus !== 'pending') return null;
    if (!['accept', 'edit', 'reject'].includes(action)) return null;
    if (action === 'edit' && !text(editedText)) return null;
    if (item.suggestionType === 'documentation_gap' && action !== 'reject') return null;
    if (action === 'edit') item.text = text(editedText);
    item.verificationStatus = action === 'reject' ? 'rejected' : 'confirmed';
    if (item.suggestionType === 'goal_alignment' && item.verificationStatus === 'confirmed') {
        state.links.push({ evidence_id: item.id, objective_text: item.treatmentObjective,
            relationship: item.text, verificationStatus: 'confirmed' });
    }
    state.audit.push({ candidateId: item.id, action, at: now });
    state.noteRevision = (state.noteRevision || 0) + 1;
    state.consistency = { status: 'review_required', issues: [] };
    return item;
}

export function markClinicalDependencies(soap, previousObjective, nextObjective) {
    const state = soap?.clinicalReview;
    if (!state || text(previousObjective) === text(nextObjective)) return;
    state.noteRevision = (state.noteRevision || 0) + 1;
    const next = new Set(lines(nextObjective).map(key));
    const removedIds = new Set(state.evidence.concat(state.candidates)
        .filter(item => lines(previousObjective).some(line => key(line) === key(item.text)) && !next.has(key(item.text)))
        .map(item => item.id));
    state.consistency = { status: 'review_required', issues: ['Objective changed. Review Assessment and generated support fields.'] };
    state.staleFields = ['a', 'diagnosticSupport', 'medicalNecessity', 'interventions', 'presentingProblem'];
    state.affectedStatements = Object.entries(state.dependencies || {}).flatMap(([field, items]) => (
        Array.isArray(items) ? items.filter(item => (item.evidence_ids || []).some(id => removedIds.has(id)))
            .map(item => ({ field, text: item.text })) : []
    ));
}

export function confirmedClinicalContext(soap) {
    const state = soap?.clinicalReview;
    if (!state) return '';
    const included = new Set(lines(soap.o).map(key));
    return JSON.stringify({
        currentObjective: soap.o || '',
        evidence: state.evidence.concat(state.candidates)
            .filter(item => ['direct', 'confirmed'].includes(item.verificationStatus) && (included.has(key(item.text)) || (item.targetField === 'context' && item.sourceVerified))),
        links: (state.links || []).filter(link => state.evidence.concat(state.candidates).some(item => item.id === link.evidence_id && included.has(key(item.text)) && ['direct', 'confirmed'].includes(item.verificationStatus))),
        excludedCandidateIds: state.candidates.filter(item => item.verificationStatus !== 'confirmed').map(item => item.id)
    });
}

export function normalizeNecessity(value, sources = null) {
    if (!value || typeof value !== 'object' || value.status !== 'supported' || typeof value.statement !== 'string' || !text(value.statement)) {
        return { statement: '', status: 'review_required', missing: Array.isArray(value?.missing_documentation)
            ? value.missing_documentation.map(text).filter(Boolean) : ['Review symptoms, functioning, continuing need and skilled treatment requirements.'] };
    }
    if (sources && !(Array.isArray(value.supporting_sources) && value.supporting_sources.some(item =>
        item && ['current', 'longitudinal'].includes(item.source) && typeof item.quote === 'string' && text(item.quote) && (sources[item.source] || []).some(source => text(source).includes(text(item.quote)))))) {
        return { statement: '', status: 'review_required', missing: ['The proposed rationale did not cite matching current or verified historical evidence.'] };
    }
    return { statement: text(value.statement), status: 'supported', missing: [] };
}

export function prepareClinicalGeneration(payload, sessionInfo, generationId, previousSoap = {}) {
    if (!payload || !['s', 'o', 'a', 'p'].every(field => typeof payload[field] === 'string')) {
        throw new Error('Incomplete SOAP response. The previous note has been retained.');
    }
    const next = structuredClone(payload);
    const state = initializeClinicalReview(next, sessionInfo, generationId);
    const prior = previousSoap.clinicalReview;
    if (prior) {
        state.manualEdits = { ...prior.manualEdits };
        for (const field of Object.keys(state.manualEdits)) {
            if (state.manualEdits[field]) next[field] = previousSoap[field] || '';
        }
        if (prior.sourceKey === sourceKey(sessionInfo)) {
            const rejected = new Set(prior.candidates.filter(item => item.verificationStatus === 'rejected').map(item => key(item.text)));
            state.candidates = state.candidates.filter(item => !rejected.has(key(item.text)));
            for (const item of prior.candidates) {
                if (item.verificationStatus === 'pending') continue;
                const field = item.targetField || 'o';
                if (item.verificationStatus === 'confirmed' && !lines(previousSoap[field]).some(line => key(line) === key(item.text))) continue;
                const retained = { ...item, id: `${generationId}:${item.id}` };
                state.candidates = state.candidates.filter(candidate => key(candidate.text) !== key(item.text));
                state.candidates.push(retained);
                if (item.verificationStatus === 'confirmed' && !lines(next[field]).some(line => key(line) === key(item.text))) next[field] = bulletText([...lines(next[field]), item.text]);
            }
            // Regeneration must not restore a previously rejected candidate as direct output.
            for (const field of ['s', 'o', 'a', 'p']) {
                const currentLines = lines(next[field]);
                if (currentLines.some(line => rejected.has(key(line)))) next[field] = bulletText(currentLines.filter(line => !rejected.has(key(line))));
            }
            state.audit = [...prior.audit, { action: 'regenerate', at: new Date().toISOString() }];
        }
    }
    return { payload: next, state };
}
