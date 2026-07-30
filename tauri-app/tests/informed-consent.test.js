import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const requiredVisibleWording = 'Sessions scheduled in a one-hour appointment block include 53 minutes of direct session time; the remaining time is reserved for documentation and care coordination.';
const requiredNotationWording = 'Reviewed session duration, including that sessions scheduled in a one-hour appointment block provide 53 minutes of direct session time, with the remaining time reserved for documentation and care coordination.';

for (const path of ['index.html', 'src/index.html']) {
    test(`${path} includes session duration in informed consent and copied notation`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
        assert.match(html, new RegExp(requiredVisibleWording.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        assert.match(html, new RegExp(requiredNotationWording.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    });
}
