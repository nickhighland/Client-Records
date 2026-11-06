import test from 'node:test';
import { readApplicationSource } from './helpers/application-source.js';
import assert from 'node:assert/strict';

const requiredVisibleWording = 'Sessions scheduled in a one-hour appointment block include 53 minutes of direct session time; the remaining time is reserved for documentation and care coordination.';
const requiredNotationWording = 'Reviewed session duration, including that sessions scheduled in a one-hour appointment block provide 53 minutes of direct session time, with the remaining time reserved for documentation and care coordination.';

for (const path of ['index.html']) {
    test(`${path} includes session duration in informed consent and copied notation`, async () => {
        const html = await readApplicationSource();
        assert.match(html, new RegExp(requiredVisibleWording.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        assert.match(html, new RegExp(requiredNotationWording.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    });
}
