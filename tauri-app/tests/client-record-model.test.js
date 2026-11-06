import test from 'node:test';
import assert from 'node:assert/strict';
import {
    ensureClientContactInfo,
    formatClientPhoneInput,
    formatTreatmentPlanDiagnosisEntries,
    getClientContactValidationMessage,
    parseTreatmentPlanDiagnosisEntries,
    normalizeSessionMembers
} from '../src/domain/client-record.js';

test('contact migration preserves existing values and locks entries by default', () => {
    const client = {
        phone: '(212)555-0100',
        email: 'legacy address without validation'
    };

    const contactInfo = ensureClientContactInfo(client);
    assert.deepEqual(contactInfo.phones, [{ value: '(212)555-0100', locked: true }]);
    assert.deepEqual(contactInfo.emails, [{ value: 'legacy address without validation', locked: true }]);
});

test('phone entry formatting ignores punctuation and accepts digits only', () => {
    assert.equal(formatClientPhoneInput('(212)-555-0100'), '(212) 555-0100');
    assert.equal(formatClientPhoneInput('2125550100'), '(212) 555-0100');
});

test('contact validation requires a fully formatted phone or a valid email shape', () => {
    assert.equal(getClientContactValidationMessage('phones', '(212) 555-0100'), '');
    assert.match(getClientContactValidationMessage('phones', '2125550100'), /10-digit/);
    assert.equal(getClientContactValidationMessage('emails', 'client@example.com'), '');
    assert.match(getClientContactValidationMessage('emails', 'client.example.com'), /@ and a period/);
});

test('session-member normalization preserves names, open roles, and each member’s pronouns', () => {
    const members = normalizeSessionMembers([
        { id: 'member-a', name: 'Ted', role: 'co-parent', preferredPronouns: { value: 'he/him/his' } },
        { id: 'member-b', name: 'Sally', role: 'partner', preferredPronouns: { value: 'she/her/hers' } }
    ]);

    assert.deepEqual(members.map(({ name, role, preferredPronouns }) => ({ name, role, pronouns: preferredPronouns.value })), [
        { name: 'Ted', role: 'co-parent', pronouns: 'he/him/his' },
        { name: 'Sally', role: 'partner', pronouns: 'she/her/hers' }
    ]);
});

test('treatment-plan diagnosis input formats each diagnosis with its substantiation', () => {
    const formatted = formatTreatmentPlanDiagnosisEntries({
        diagnoses: [
            { id: 'dx-1', name: 'F41.1 Generalized anxiety disorder', substantiation: 'Excessive worry across multiple areas.' },
            { id: 'dx-2', name: 'F34.1 Persistent depressive disorder', substantiation: 'Persistent low mood and reduced motivation.' }
        ]
    });

    assert.equal(formatted, 'F41.1 Generalized anxiety disorder\nExcessive worry across multiple areas.\n\nF34.1 Persistent depressive disorder\nPersistent low mood and reduced motivation.');
});

test('treatment-plan diagnosis blocks parse support text without mislabeling it as another diagnosis', () => {
    const entries = parseTreatmentPlanDiagnosisEntries('F41.1 Generalized anxiety disorder\nWorry across several areas.\nSymptoms interfere with sleep.\n\nF34.1 Persistent depressive disorder\nLow mood and reduced motivation.');

    assert.deepEqual(entries, [
        {
            name: 'F41.1 Generalized anxiety disorder',
            substantiation: 'Worry across several areas.\nSymptoms interfere with sleep.'
        },
        {
            name: 'F34.1 Persistent depressive disorder',
            substantiation: 'Low mood and reduced motivation.'
        }
    ]);
});

test('treatment-plan diagnosis formatting falls back to legacy diagnosis names', () => {
    assert.equal(
        formatTreatmentPlanDiagnosisEntries({ diagnosis: 'F41.1 Generalized anxiety disorder\nF34.1 Persistent depressive disorder' }),
        'F41.1 Generalized anxiety disorder\n\nF34.1 Persistent depressive disorder'
    );
});
