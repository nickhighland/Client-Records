import test from 'node:test';
import assert from 'node:assert/strict';
import {
    extractInterventionsFromObjective,
    selectInterventionsFromBank
} from '../src/features/interventions/intervention-matching.js';

test('intervention matching keeps only directly or strongly supported bank items', () => {
    const bank = [
        'Socratic Questioning',
        'Narrative Deconstruction',
        'Cognitive Restructuring'
    ];
    const selected = selectInterventionsFromBank(bank, [
        { name: 'Socratic Questioning', support: 'direct' },
        { name: 'Narrative Deconstruction', support: 'interpretive' },
        { name: 'Cognitive Restructuring', support: 'stretch' }
    ]);

    assert.deepEqual(selected, ['Socratic Questioning']);
});

test('objective extraction matches supported entries in each bullet', () => {
    const bank = [
        'Socratic Questioning',
        'Narrative Deconstruction',
        'Cognitive Restructuring'
    ];

    assert.deepEqual(
        extractInterventionsFromObjective(
            '• Writer used Socratic questions to examine the belief.\n• Writer supported narrative deconstruction.',
            bank
        ),
        ['Socratic Questioning', 'Narrative Deconstruction']
    );
});

test('intervention matching rejects unsupported guesses and caps output', () => {
    const bank = Array.from({ length: 18 }, (_, index) => `Intervention ${index + 1}`);
    const candidates = bank.map(name => ({ name, support: 'direct' }));

    assert.equal(selectInterventionsFromBank(bank, candidates).length, 15);
    assert.deepEqual(selectInterventionsFromBank(bank, [{ name: bank[0], support: 'interpretive' }]), []);
});
