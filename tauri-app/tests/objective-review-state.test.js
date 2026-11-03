import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Exercise the shipped handler and review functions with a small DOM adapter.
// Sorting deliberately changes positions to catch stale item/source indexes.
const loadReviewRuntime = (html, appointment) => {
    const names = [
        'splitSoapBulletItems', 'joinSoapBulletItems', 'normalizeObjectiveLine',
        'ensureSoapObjectiveActionState', 'updateSoapFieldValue',
        'getObjectiveRedundancySuggestionItems', 'buildObjectiveRedundancyReviewData',
        'getObjectiveRedundancyReview', 'getObjectiveRedundancyItemsForReview',
        'reconcileObjectiveRedundancyReview', 'getSelectedObjectiveRedundancyIndexes',
        'getSelectedObjectiveRedundancyItemIndexes', 'getObjectiveRedundancyGroupedItemIndexes',
        'getObjectiveRedundancyGroupedSuggestionSourceIndexes', 'getObjectiveRedundancyDecision'
    ];
    const declarations = names.map(name => {
        const start = html.indexOf(`const ${name} =`);
        assert.ok(start >= 0, `Missing runtime function ${name}`);
        return html.slice(start, html.indexOf('\n            const ', start + 1));
    }).join('\n');
    const handlerStart = html.indexOf('const handleSuggestion =');
    const handler = html.slice(handlerStart, html.indexOf('const SOAP_INSTRUCTION_SECTION_DEFS', handlerStart));
    return new Function('appointment', `
        const selectedClientId = 'client';
        const selectedAppointmentId = 'appointment';
        const findClient = () => ({});
        const findAppointment = () => appointment;
        const fields = { soapO: { value: appointment.soap.o, offsetTop: 0 },
            soapS: { value: appointment.soap.s || '', offsetTop: 0 },
            soapContent: { scrollTop: 0 } };
        const document = { getElementById: id => fields[id] };
        const requestAnimationFrame = callback => callback();
        const markDirty = () => {};
        const renderSoap = () => {};
        const refreshObjectiveSuggestionInterventionMatches = () => {};
        const SOAP_SORT_SECTION_KEYS = ['o', 's', 'a', 'p'];
        const ensureSoapSectionOrderOverrides = () => ({});
        const isSoapSectionOrderOverridden = () => false;
        const alignSoapSectionsByObjectiveOrder = soap => {
            soap.o = soap.o.split('\\n').reverse().join('\\n');
            soap.o_suggestion.reverse();
        };
        ${declarations}
        ${handler}
        return {
            seed(groups) {
                const data = buildObjectiveRedundancyReviewData(appointment);
                appointment.soap.objectiveRedundancyReview = { ...data, groups,
                    selectedItemIndexes: data.items.flatMap((item, i) => item.kind === 'objective' ? [i] : []) };
            },
            act(type, index, accepted, close = false) {
                fields.soapO.value = appointment.soap.o;
                handleSuggestion({ closest: () => ({ dataset: {
                    suggestionType: type, suggestionIndex: String(index)
                } }) }, accepted, close);
            },
            review: () => getObjectiveRedundancyReview(appointment),
            groupedSources: () => getObjectiveRedundancyGroupedSuggestionSourceIndexes(getObjectiveRedundancyReview(appointment)),
            decision: () => getObjectiveRedundancyDecision(getObjectiveRedundancyReview(appointment))
        };
    `)(appointment);
};

for (const path of ['index.html', 'src/index.html']) {
    const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
    const setup = (firstSuggestion = 'Unique addition') => {
        const appointment = { soap: {
            o: '• Values exploration\n• Workplace discussion',
            o_suggestion: [firstSuggestion, 'Values paraphrase', 'Workplace paraphrase'],
            s_suggestion: ['Subjective addition']
        } };
        const runtime = loadReviewRuntime(html, appointment);
        runtime.seed([
            { id: 'values', label: 'Values', itemIndexes: [0, 3], selectedItemIndexes: [3] },
            { id: 'work', label: 'Workplace', itemIndexes: [1, 4], selectedItemIndexes: [] }
        ]);
        return { appointment, runtime };
    };

    test(`${path}: accepting an ungrouped addition preserves groups, selections and Organize input`, () => {
        const { appointment, runtime } = setup();
        runtime.act('o', 0, true);
        const review = runtime.review();
        assert.ok(review);
        assert.deepEqual(review.groups.map(g => g.id), ['values', 'work']);
        assert.deepEqual(review.groups[0].selectedItemIndexes.map(i => review.items[i].text), ['Values paraphrase']);
        assert.deepEqual(review.groups[1].selectedItemIndexes, []);
        assert.deepEqual([...runtime.groupedSources()].sort(), [0, 1]);
        assert.deepEqual(runtime.decision().objectiveItems.sort(), ['Unique addition', 'Values paraphrase']);
        assert.match(appointment.soap.o, /Unique addition/);
        assert.equal(appointment.soap.objectiveActionState.organizedRevision, null);
    });

    for (const close of [false, true]) {
        test(`${path}: ${close ? 'closing' : 'declining'} an ungrouped suggestion preserves grouped suggestions`, () => {
            const { runtime } = setup();
            runtime.act('o', 0, false, close);
            assert.equal(runtime.review().groups.length, 2);
            assert.deepEqual([...runtime.groupedSources()].sort(), [0, 1]);
            assert.deepEqual(runtime.decision().objectiveItems, ['Values paraphrase']);
        });
    }

    test(`${path}: keeping an ungrouped replacement original retains groups`, () => {
        const { runtime } = setup({ original: 'Original observation', suggested: 'Reworded observation' });
        runtime.act('o', 0, false);
        assert.equal(runtime.review().groups.length, 2);
        assert.deepEqual(runtime.decision().objectiveItems.sort(), ['Original observation', 'Values paraphrase']);
    });

    test(`${path}: accepting a Subjective suggestion preserves groups after sorting Objective`, () => {
        const { runtime } = setup();
        runtime.act('s', 0, true);
        assert.equal(runtime.review().groups.length, 2);
        assert.deepEqual([...runtime.groupedSources()].sort(), [0, 1]);
        assert.deepEqual(runtime.decision().objectiveItems, ['Values paraphrase']);
    });
}
