export const LAB_BUILD = true;
const fields = ['s', 'o', 'a', 'p', 'interventions', 'presentingProblem', 'diagnosticSupport', 'medicalNecessity'];
export const draftSignature = (soap, chartSnapshot = null) => {
    const content = JSON.stringify([fields.map(field => soap?.[field] || ''), chartSnapshot]);
    let a = 2166136261, b = 5381;
    for (const char of content) { a = Math.imul(a ^ char.charCodeAt(0), 16777619); b = Math.imul(b, 33) ^ char.charCodeAt(0); }
    return `${content.length}:${a >>> 0}:${b >>> 0}`;
};

export function checkpointDraft(appointment, label, now = Date.now()) {
    if (!appointment?.soap || !fields.some(field => appointment.soap[field])) return;
    const history = appointment.draftHistory ||= [];
    const signature = draftSignature(appointment.soap, appointment.chartSnapshot);
    if (history[0]?.signature === signature) return;
    if (label === 'Before editing' && history[0]?.label === label && now - history[0].at < 5000) return;
    history.unshift({ id: crypto.randomUUID(), label, at: now, signature, soap: structuredClone(appointment.soap), chartSnapshot: structuredClone(appointment.chartSnapshot || null) });
    history.splice(10);
}
export function restoreDraft(appointment, id) {
    const prior = appointment?.draftHistory?.find(item => item.id === id);
    if (!prior) return false;
    const restored = structuredClone(prior);
    checkpointDraft(appointment, 'Before restoring');
    appointment.soap = restored.soap;
    appointment.chartSnapshot = restored.chartSnapshot;
    if (appointment.soap.clinicalReview) {
        appointment.soap.clinicalReview.noteRevision += 1;
        appointment.soap.clinicalReview.consistency = { status: 'review_required', issues: ['Restored working draft. Review before transfer.'] };
    }
    return true;
}

export function createSaveCoordinator({ capture, persist, onSaved = () => {} }) {
    let revision = 0, savedRevision = 0, running = null;
    return {
        touch() { revision++; },
        get dirty() { return revision !== savedRevision; },
        flush() {
            if (running) return running;
            running = (async () => {
                do {
                    const capturedRevision = revision;
                    const snapshot = structuredClone(capture());
                    await persist(snapshot);
                    savedRevision = capturedRevision;
                    onSaved({ revision: savedRevision, dirty: revision !== savedRevision });
                } while (savedRevision !== revision);
            })().finally(() => { running = null; });
            return running;
        }
    };
}

export function createAiJobs(fetchImpl, { timeoutMs = 90000, onStatus = () => {} } = {}) {
    let active = null;
    const cancelled = () => new DOMException('AI operation cancelled or session context changed.', 'AbortError');
    const check = () => {
        if (active && (active.controller.signal.aborted || active.snapshot !== active.readSource())) throw cancelled();
    };
    return {
        get busy() { return Boolean(active); },
        check,
        cancel() { active?.controller.abort(); onStatus('Cancelled'); },
        async run(label, readSource, action) {
            if (active) throw new Error('Another AI operation is running. Finish or cancel it first.');
            const job = { readSource, snapshot: readSource(), controller: new AbortController() };
            active = job; onStatus(label);
            try { return await action(); }
            finally { if (active === job) active = null; onStatus(''); }
        },
        async fetch(url, options = {}) {
            check();
            const controller = active?.controller || new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            try { const response = await fetchImpl(url, { ...options, signal: controller.signal }); check(); return response; }
            finally { clearTimeout(timer); }
        }
    };
}

export function transferSections(root, enabledKeys) {
    return enabledKeys.flatMap(key => {
        const section = root.querySelector(`[data-soap-section-key="${key}"]`);
        const field = section?.querySelector('textarea');
        if (!field || !field.value.trim()) return [];
        return [{ key, id: field.id, title: section.querySelector('.soap-header span, .soap-support-header > span')?.firstChild?.textContent?.trim() || key, text: field.value }];
    });
}
export const transferText = (sections, headings = true) => sections.map(section => headings ? `${section.title}\n${section.text}` : section.text).join('\n\n');
