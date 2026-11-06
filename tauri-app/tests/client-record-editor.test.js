import test from 'node:test';
import assert from 'node:assert/strict';
import { createClientRecordEditor } from '../src/features/clients/client-record-editor.js';

test('contact edits and saves update only the selected client record', () => {
    const client = {
        id: 'client-1',
        contactInfo: { phones: [{ value: '', locked: false }], emails: [] },
        diagnoses: []
    };
    let dirtyCount = 0;
    let renderCount = 0;
    const editor = createClientRecordEditor({
        getState: () => ({ selectedClientId: client.id, recordViewClearedForSelectedClient: false }),
        findClient: id => id === client.id ? client : null,
        ensureClientContactInfo: record => record.contactInfo,
        getClientContactEntryValue: entry => entry?.value || '',
        getClientContactValidationMessage: () => '',
        isClientContactEntryLocked: entry => !!entry.locked,
        getClientDiagnoses: record => record.diagnoses,
        syncLegacyDiagnosisText: () => {},
        updateRenderedClientContactValidation: () => {},
        markDirty: () => { dirtyCount += 1; },
        renderDetails: () => { renderCount += 1; },
        clientDiagnosesListEl: {},
        contactIcons: { check: '✓', copy: '⧉' }
    });

    editor.updateClientContactEntry('phones', 0, '(212) 555-0100');
    assert.equal(client.contactInfo.phones[0].value, '(212) 555-0100');
    assert.equal(client.contactInfo.phones[0].locked, false);
    assert.equal(editor.setClientContactLock('phones', 0, true), true);
    assert.equal(client.contactInfo.phones[0].locked, true);
    assert.equal(dirtyCount, 2);
    assert.equal(renderCount, 1);
});

test('diagnosis removal keeps the legacy diagnosis field synchronized', () => {
    const client = {
        id: 'client-1',
        diagnosis: 'Anxiety',
        diagnoses: [{ id: 'd1', name: 'Anxiety', substantiation: 'Documented criteria' }]
    };
    let dirtyCount = 0;
    const editor = createClientRecordEditor({
        getState: () => ({ selectedClientId: client.id, recordViewClearedForSelectedClient: false }),
        findClient: id => id === client.id ? client : null,
        ensureClientContactInfo: record => record.contactInfo || (record.contactInfo = { phones: [], emails: [] }),
        getClientContactEntryValue: entry => entry?.value || '',
        getClientContactValidationMessage: () => '',
        isClientContactEntryLocked: entry => !!entry.locked,
        getClientDiagnoses: record => record.diagnoses,
        syncLegacyDiagnosisText: record => { record.diagnosis = record.diagnoses.map(item => item.name).join('; '); },
        updateRenderedClientContactValidation: () => {},
        markDirty: () => { dirtyCount += 1; },
        renderDetails: () => {},
        clientDiagnosesListEl: {},
        contactIcons: {}
    });

    editor.removeClientDiagnosis('d1');
    assert.deepEqual(client.diagnoses, []);
    assert.equal(client.diagnosis, '');
    assert.equal(dirtyCount, 1);
});
