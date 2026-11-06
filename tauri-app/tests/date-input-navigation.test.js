import test from 'node:test';
import { readApplicationSource } from './helpers/application-source.js';
import assert from 'node:assert/strict';

for (const path of ['index.html']) {
    test(`${path} advances segmented date fields without changing stored date values`, async () => {
        const html = await readApplicationSource();

        assert.match(html, /class="segmented-date-control" data-segmented-date-input="appointmentDateInput"/);
        assert.match(html, /class="segmented-date-control compact" data-segmented-date-input="treatmentPlanStartDateInput"/);
        assert.match(html, /data-date-segment="month" type="text" inputmode="numeric" maxlength="2"/);
        assert.match(html, /data-date-segment="day" type="text" inputmode="numeric" maxlength="2"/);
        assert.match(html, /data-date-segment="year" type="text" inputmode="numeric" maxlength="4"/);
        assert.match(html, /const focusSegmentedDatePart =/);
        assert.match(html, /const handleSegmentedDateInput =/);
        assert.match(html, /digits\.length === maxLength/);
        assert.match(html, /event\.key === 'Backspace'/);
        assert.match(html, /const updateSegmentedDateInputValue =/);
        assert.match(html, /valueInput\.dispatchEvent\(new Event\('change'/);
        assert.match(html, /syncSegmentedDateInput\('appointmentDateInput', nextValue\)/);
        assert.match(html, /syncSegmentedDateInput\('treatmentPlanStartDateInput', treatmentPlanStartDate\)/);
        assert.match(html, /const initializeSegmentedDateInputs =/);
        assert.match(html, /initializeSegmentedDateInputs\(\);/);
    });
}
