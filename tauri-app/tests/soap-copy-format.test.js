import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildSoapCopySectionBlocks } from '../src/soap-copy-format.js';

test('Copy All never includes Audit Check and groups psychotherapy times in order', () => {
    const blocks = buildSoapCopySectionBlocks(
        ['s', 'auditCheck', 'psychotherapyEndTime', 'p', 'psychotherapyStartTime', 'actualPsychotherapyMinutes'],
        {
            s: 'Ct reported anxiety.',
            auditCheck: 'Audit passed.',
            psychotherapyStartTime: '10:00 AM',
            psychotherapyEndTime: '10:53 AM',
            actualPsychotherapyMinutes: '53 minutes',
            p: 'Continue weekly treatment.'
        },
        key => ({ s: 'Subjective', p: 'Plan' })[key] || key
    );

    assert.deepEqual(blocks, [
        'Subjective\nCt reported anxiety.',
        'Psychotherapy Time\nStart Time: 10:00 AM\nEnd Time: 10:53 AM\nActual Time of Psychotherapy: 53 minutes',
        'Plan\nContinue weekly treatment.'
    ]);
});

test('psychotherapy time group respects configured fields and omits empty values', () => {
    const blocks = buildSoapCopySectionBlocks(
        ['psychotherapyStartTime', 'auditCheck', 'actualPsychotherapyMinutes'],
        {
            psychotherapyStartTime: '9:30 AM',
            actualPsychotherapyMinutes: ''
        }
    );

    assert.deepEqual(blocks, ['Psychotherapy Time\nStart Time: 9:30 AM']);
});

for (const path of ['../index.html', '../src/index.html']) {
    test(`${path} routes Copy All through Audit Check exclusion and psychotherapy time grouping`, async () => {
        const html = await readFile(new URL(path, import.meta.url), 'utf8');

        assert.match(html, /import \{ buildSoapCopySectionBlocks \} from '\.\/src\/soap-copy-format\.js'/);
        assert.match(html, /buildSoapCopySectionBlocks\([\s\S]*?getSoapPlatformSectionKeysForAppointment\(client, appointment\)/);
        assert.doesNotMatch(html, /auditCheck:\s*auditText/);
        assert.match(html, /data-soap-section-key="auditCheck"/);
    });
}
