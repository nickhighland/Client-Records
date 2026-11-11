import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
    CUSTOM_SERVICE_TYPE_CPT_VALUE,
    DEFAULT_SERVICE_TYPE_CPT,
    SERVICE_TYPE_CPT_OPTIONS,
    resolveServiceTypeCptSelection
} from '../src/service-type-cpt.js';

test('90837 is the default for new appointments and is present in the service code list', () => {
    assert.equal(DEFAULT_SERVICE_TYPE_CPT, '90837');
    assert.ok(SERVICE_TYPE_CPT_OPTIONS.some(option => option.value === DEFAULT_SERVICE_TYPE_CPT));
});

test('known service codes resolve to their dropdown option', () => {
    assert.deepEqual(resolveServiceTypeCptSelection('90834'), {
        selection: '90834',
        customValue: ''
    });
});

test('legacy free-text entries are preserved as custom values', () => {
    const legacyValue = 'Individual psychotherapy / 90837';
    assert.deepEqual(resolveServiceTypeCptSelection(legacyValue), {
        selection: CUSTOM_SERVICE_TYPE_CPT_VALUE,
        customValue: legacyValue
    });
});

test('blank legacy service codes stay unassigned instead of receiving a retroactive default', () => {
    assert.deepEqual(resolveServiceTypeCptSelection(''), {
        selection: '',
        customValue: ''
    });
});

for (const path of ['../index.html', '../src/index.html']) {
    test(`${path} renders the CPT dropdown, custom entry, and new-appointment default`, async () => {
        const html = await readFile(new URL(path, import.meta.url), 'utf8');

        assert.match(html, /import \{[\s\S]*?DEFAULT_SERVICE_TYPE_CPT[\s\S]*?from '\.\/src\/service-type-cpt\.js'/);
        assert.match(html, /data-session-field="serviceTypeCptCode"/);
        assert.match(html, /data-session-field="serviceTypeCptCustom"/);
        assert.match(html, /id="soapServiceTypeCpt" class="soap-session-copy-value"/);
        assert.match(html, /serviceTypeCpt: DEFAULT_SERVICE_TYPE_CPT/);
    });
}
