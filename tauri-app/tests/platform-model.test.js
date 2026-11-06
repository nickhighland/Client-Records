import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getDefaultSoapPlatforms,
    getSoapPlatformSectionKeysForAppointmentFromList,
    normalizeSoapPlatformList
} from '../src/features/soap/platform-model.js';

test('new platform defaults include all known sections in order', () => {
    const platforms = getDefaultSoapPlatforms();
    assert.equal(platforms.length, 1);
    assert.equal(platforms[0].id, 'standard');
    assert.ok(platforms[0].sections.every(section => section.enabled));
});

test('normalizing a saved platform preserves its order and does not enable new options', () => {
    const result = normalizeSoapPlatformList([{ id: 'headway', name: 'Headway', sections: ['o', 's'] }]);
    assert.deepEqual(result.platforms[0].sections.slice(0, 2).map(section => section.key), ['o', 's']);
    for (const key of ['diagnosisWithSubstantiation', 'diagnosisWithoutSubstantiation', 'sessionFocus', 'treatmentPlan']) {
        assert.equal(result.platforms[0].sections.find(section => section.key === key).enabled, false);
    }
});

test('appointment snapshots retain their original section layout after platform changes', () => {
    const appointment = {
        soap: { s: 'old', o: 'old' },
        soapPlatformSnapshot: {
            platformId: 'old-platform',
            sections: [{ key: 'o', enabled: true }, { key: 's', enabled: false }]
        }
    };

    assert.deepEqual(getSoapPlatformSectionKeysForAppointmentFromList([], null, appointment), ['o']);
});

test('notes without a platform snapshot keep their legacy layout', () => {
    const appointment = { soap: { s: 'old note', o: 'old objective' } };
    assert.deepEqual(
        getSoapPlatformSectionKeysForAppointmentFromList([], null, appointment),
        ['s', 'o', 'interventions', 'a', 'p', 'presentingProblem', 'diagnosticSupport', 'medicalNecessity', 'auditCheck']
    );
});
