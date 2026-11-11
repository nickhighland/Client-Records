import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

for (const path of ['index.html', 'src/index.html']) {
    test(`${path} advances segmented date fields and accepts a compact date string`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');

        assert.match(html, /class="segmented-date-control" data-segmented-date-input="appointmentDateInput"/);
        assert.match(html, /data-date-segment="month" type="text" inputmode="numeric" maxlength="8"/);
        assert.match(html, /data-date-segment="day" type="text" inputmode="numeric" maxlength="8"/);
        assert.match(html, /data-date-segment="year" type="text" inputmode="numeric" maxlength="8"/);
        assert.match(html, /const focusSegmentedDatePart =/);
        assert.match(html, /const applySegmentedDateDigitString =/);
        assert.match(html, /parseCompactDateDigits\(digits\)/);
        assert.match(html, /const handleSegmentedDatePaste =/);
        assert.match(html, /segment\.addEventListener\('paste', handleSegmentedDatePaste\)/);
        assert.match(html, /const handleSegmentedDateInput =/);
        assert.match(html, /digits\.length === maxLength/);
        assert.match(html, /event\.key === 'Backspace'/);
        assert.match(html, /const updateSegmentedDateInputValue =/);
        assert.match(html, /valueInput\.dispatchEvent\(new Event\('change'/);
        assert.match(html, /syncSegmentedDateInput\('appointmentDateInput', nextValue\)/);
        assert.match(html, /const initializeSegmentedDateInputs =/);
        assert.match(html, /initializeSegmentedDateInputs\(\);/);
        assert.doesNotMatch(html, /treatmentPlanStartDateInput/);
    });
}
