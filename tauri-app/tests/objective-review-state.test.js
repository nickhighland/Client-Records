import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const loadReviewRuntime = (html, appointment) => {
    const names = [
        'soapTopicStopWords', 'soapTopicWeakAnchorTokens', 'normalizeInterventionText', 'stemInterventionToken',
        'tokenizeForSoapTopic', 'scoreTopicOverlap', 'hasStrongSingleTopicAnchor', 'buildObjectiveTopicClusters',
        'splitSoapBulletItems', 'joinSoapBulletItems', 'normalizeObjectiveLine', 'normalizeObjectiveRedundancyLabel',
        'normalizeObjectiveRedundancyGroupsFromAi', 'deriveObjectiveTopicLabel', 'buildLocalObjectiveTopicGroups',
        'completeObjectiveTopicGroups', 'limitObjectiveReviewDefaults', 'ensureSoapObjectiveActionState', 'updateSoapFieldValue',
        'getObjectiveRedundancySuggestionItems', 'buildObjectiveRedundancyReviewData', 'getObjectiveRedundancyItemsForReview',
        'getSelectedObjectiveRedundancyIndexes', 'getSelectedObjectiveRedundancyItemIndexes',
        'getObjectiveRedundancyGroupedItemIndexes', 'getObjectiveRedundancyGroupedSuggestionSourceIndexes',
        'getObjectiveRedundancyReview', 'reconcileObjectiveRedundancyReview', 'setObjectiveRedundancyItemSelected',
        'syncObjectiveRedundancySelectionsFromDom', 'getObjectiveRedundancyDecision', 'applyObjectiveRedundancyDecision'
    ];
    const declarations = names.map(name => {
        const start = html.indexOf(`const ${name} =`);
        assert.ok(start >= 0, `Missing runtime function ${name}`);
        return html.slice(start, html.indexOf('\n            const ', start + 1));
    }).join('\n');

    return new Function('appointment', `
        const selectedClientId = 'client';
        const selectedAppointmentId = 'appointment';
        const findClient = () => ({ id: 'client' });
        const findAppointment = () => appointment;
        const fields = { soapO: { value: appointment.soap.o, offsetTop: 0 }, soapS: { value: appointment.soap.s || '', offsetTop: 0 } };
        const document = { getElementById: id => fields[id] || null };
        const alertMessages = [];
        const alert = message => alertMessages.push(message);
        const markDirty = () => {};
        const refreshObjectiveSuggestionInterventionMatches = () => {};
        const SOAP_SORT_SECTION_KEYS = ['o', 's', 'a', 'p'];
        const ensureSoapSectionOrderOverrides = () => ({});
        const isSoapSectionOrderOverridden = () => false;
        ${declarations}
        const makeReview = (groups) => {
            const data = buildObjectiveRedundancyReviewData(appointment);
            const completedGroups = limitObjectiveReviewDefaults(completeObjectiveTopicGroups(data.items, groups));
            appointment.soap.objectiveRedundancyReview = {
                reviewId: 'review-1',
                ...data,
                groups: completedGroups,
                manualObjectiveNote: '',
                selectedItemIndexes: [...new Set(completedGroups.flatMap(group => group.selectedItemIndexes))]
            };
            fields.objectiveRedundancyReview = {
                dataset: { reviewId: 'review-1' },
                checkboxes: [],
                editors: [],
                manualNoteEditor: null,
                querySelectorAll(selector) {
                    return selector === '.objective-redundancy-checkbox' ? this.checkboxes
                        : selector === '.objective-review-editor' ? this.editors : [];
                },
                querySelector(selector) {
                    return selector === '.objective-manual-note-editor' ? this.manualNoteEditor : null;
                }
            };
            return appointment.soap.objectiveRedundancyReview;
        };
        ${''}
        return {
            review: () => getObjectiveRedundancyReview(appointment),
            makeReview,
            normalize: payload => normalizeObjectiveRedundancyGroupsFromAi(buildObjectiveRedundancyReviewData(appointment).items, payload),
            complete: groups => completeObjectiveTopicGroups(buildObjectiveRedundancyReviewData(appointment).items, groups),
            select(index, checked) { return setObjectiveRedundancyItemSelected(getObjectiveRedundancyReview(appointment), index, checked); },
            showOptions(checkboxes, editors = [], manualNote = '') {
                const container = fields.objectiveRedundancyReview;
                container.checkboxes = checkboxes;
                container.manualNoteEditor = {
                    dataset: { reviewId: 'review-1' },
                    value: manualNote,
                    matches: selector => selector === '.objective-manual-note-editor'
                };
                container.editors = [
                    ...editors.map(editor => ({ ...editor, matches: editor.matches || (() => false) })),
                    container.manualNoteEditor
                ];
            },
            approve() { return applyObjectiveRedundancyDecision(appointment, getObjectiveRedundancyReview(appointment)); },
            organizeInput() {
                const review = getObjectiveRedundancyReview(appointment);
                syncObjectiveRedundancySelectionsFromDom(review);
                return getObjectiveRedundancyDecision(review).objectiveItems;
            },
            decision: () => getObjectiveRedundancyDecision(getObjectiveRedundancyReview(appointment)),
            alerts: alertMessages,
            reconcile() {
                const review = getObjectiveRedundancyReview(appointment);
                reconcileObjectiveRedundancyReview(appointment, review);
            }
        };
    `)(appointment);
};

const setup = html => {
    const appointment = { soap: {
        o: '• Ct explored personal values\n• Ct discussed workplace stress',
        o_suggestion: [
            'Writer and Ct linked values to recovery goals',
            'Writer and Ct discussed a new supervisor',
            'Writer and Ct identified a workplace coping strategy'
        ]
    } };
    return { appointment, runtime: loadReviewRuntime(html, appointment) };
};

for (const path of ['index.html', 'src/index.html']) {
    test(`${path}: AI grouping plus local fallback categorizes every Objective option`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
        const { runtime } = setup(html);
        const payload = { objective_groups: [
            { group_id: 'values', label: 'Values Recovery Support', item_ids: ['O1', 'S1'], recommended_keep_ids: ['O1'] },
            { group_id: 'work', label: 'Workplace Stress', item_ids: ['O2', 'S2'], recommended_keep_ids: ['O2'] }
        ] };
        const groups = runtime.complete(runtime.normalize(payload));
        assert.deepEqual(groups.flatMap(group => group.itemIndexes).sort((a, b) => a - b), [0, 1, 2, 3, 4]);
        assert.equal(groups.every(group => group.label.split(/\s+/).length >= 2 && group.label.split(/\s+/).length <= 3), true);
        assert.equal(groups.length, 3);
    });

    test(`${path}: Approve applies checked options and an additional manual note`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
        const { appointment, runtime } = setup(html);
        runtime.makeReview([
            { id: 'values', label: 'Values Recovery', itemIndexes: [0, 2], selectedItemIndexes: [0] },
            { id: 'work', label: 'Workplace Stress', itemIndexes: [1, 3, 4], selectedItemIndexes: [1] }
        ]);
        runtime.showOptions(
            [
                { dataset: { itemIndex: '0' }, checked: true },
                { dataset: { itemIndex: '1' }, checked: false },
                { dataset: { itemIndex: '2' }, checked: true },
                { dataset: { itemIndex: '3' }, checked: true },
                { dataset: { itemIndex: '4' }, checked: false }
            ],
            [
                { dataset: { itemIndex: '0' }, value: 'Ct named two central values' },
                { dataset: { itemIndex: '1' }, value: 'Writer and Ct addressed a new supervisor' },
                { dataset: { itemIndex: '2' }, value: 'Writer linked values and recovery' },
                { dataset: { itemIndex: '3' }, value: 'Writer and Ct chose a workplace coping strategy' },
                { dataset: { itemIndex: '4' }, value: 'Writer and Ct discussed a workplace coping strategy' }
            ],
            'Writer and Ct documented a separate follow-up note'
        );

        assert.equal(runtime.approve(), true);
        assert.deepEqual(appointment.soap.o.split('\n'), [
            '• Ct named two central values',
            '• Writer linked values and recovery',
            '• Writer and Ct chose a workplace coping strategy',
            '• Writer and Ct documented a separate follow-up note'
        ]);
        assert.deepEqual(appointment.soap.o_suggestion, []);
        assert.equal(appointment.soap.objectiveRedundancyReview, undefined);
    });

    test(`${path}: Approve rejects an empty selection and reports why`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
        const { appointment, runtime } = setup(html);
        runtime.makeReview([]);
        runtime.showOptions(appointment.soap.objectiveRedundancyReview.items.map((_, index) => ({
            dataset: { itemIndex: String(index) }, checked: false
        })));
        assert.equal(runtime.approve(), false);
        assert.equal(runtime.alerts.at(-1), 'Check at least one option or add an Objective note before approving.');
        assert.equal(appointment.soap.objectiveRedundancyReview !== undefined, true);
    });

    test(`${path}: approval selection includes multiple complementary options`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
        const { runtime } = setup(html);
        runtime.makeReview([
            { id: 'values', label: 'Values Recovery', itemIndexes: [0, 2], selectedItemIndexes: [0] },
            { id: 'work', label: 'Workplace Stress', itemIndexes: [1, 3, 4], selectedItemIndexes: [1] }
        ]);
        runtime.showOptions(
            [
                { dataset: { itemIndex: '0' }, checked: false },
                { dataset: { itemIndex: '1' }, checked: false },
                { dataset: { itemIndex: '2' }, checked: true },
                { dataset: { itemIndex: '3' }, checked: true },
                { dataset: { itemIndex: '4' }, checked: false }
            ],
            [
                { dataset: { itemIndex: '0' }, value: 'Ct explored personal values' },
                { dataset: { itemIndex: '1' }, value: 'Writer and Ct discussed a new supervisor' },
                { dataset: { itemIndex: '2' }, value: 'Writer connected values with recovery' },
                { dataset: { itemIndex: '3' }, value: 'Writer and Ct picked a coping strategy' },
                { dataset: { itemIndex: '4' }, value: 'Writer and Ct discussed a coping strategy' }
            ]
        );
        assert.deepEqual(runtime.organizeInput(), [
            'Writer connected values with recovery',
            'Writer and Ct picked a coping strategy'
        ]);
    });

    test(`${path}: review reconciliation retains edits and checkbox choices`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
        const { appointment, runtime } = setup(html);
        const review = runtime.makeReview([
            { id: 'values', label: 'Values Recovery', itemIndexes: [0, 2], selectedItemIndexes: [0, 2] },
            { id: 'work', label: 'Workplace Stress', itemIndexes: [1, 3, 4], selectedItemIndexes: [1] }
        ]);
        review.items[0].editedText = 'Ct identified a preferred recovery value';
        runtime.reconcile();
        const updated = runtime.review();
        assert.equal(updated.items.find(item => item.id === 'O1').editedText, 'Ct identified a preferred recovery value');
        assert.equal(runtime.decision().objectiveItems.includes('Ct identified a preferred recovery value'), true);
    });
}
