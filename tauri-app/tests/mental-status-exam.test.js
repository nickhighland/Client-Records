import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
    createNormalMentalStatusExam,
    formatMentalStatusExam,
    isMentalStatusExamComplete,
    MENTAL_STATUS_EXAM_FIELDS
} from '../src/mental-status-exam.js';

test('All normal creates a complete exam with a normal selection for every domain', () => {
    const exam = createNormalMentalStatusExam();
    assert.equal(isMentalStatusExamComplete(exam), true);
    assert.equal(Object.keys(exam).length, MENTAL_STATUS_EXAM_FIELDS.length);
    assert.ok(MENTAL_STATUS_EXAM_FIELDS.every(field => exam[field.key] === field.normal));
});

test('an exam remains incomplete until every domain has a selection', () => {
    const exam = createNormalMentalStatusExam();
    delete exam.safety;
    assert.equal(isMentalStatusExamComplete(exam), false);
});

test('formats selected findings and additional notes as a plain-text block', () => {
    assert.equal(formatMentalStatusExam({
        appearance: 'Appropriate grooming and attire',
        mood: 'Anxious',
        additionalNotes: 'No other concerns noted.'
    }), 'Appearance: Appropriate grooming and attire\nMood: Anxious\nAdditional Notes: No other concerns noted.');
});

for (const path of ['index.html', 'src/index.html']) {
    test(`${path} exposes the configurable MSE popup and SOAP completion indicator`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');

        assert.match(html, /id="mentalStatusExamModal"[^>]*role="dialog"/);
        assert.match(html, /id="mentalStatusExamAllNormal" type="checkbox"/);
        assert.match(html, /data-soap-section-key="mentalStatusExam"/);
        assert.match(html, /id="openMentalStatusExamBtn"/);
        assert.match(html, /id="soapCompletionIndicator"/);
        assert.match(html, /filter\(key => key !== 'auditCheck'\)/);
        assert.match(html, /createNormalMentalStatusExam/);
        assert.match(html, /areSoapSessionInformationValuesComplete\(/);
    });
}
