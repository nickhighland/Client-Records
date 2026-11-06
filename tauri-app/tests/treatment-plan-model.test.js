import test from 'node:test';
import assert from 'node:assert/strict';
import {
    addMonthsToDateInput,
    getGoalTreatmentPlanStartDate,
    getObjectiveTreatmentPlanStartDate,
    normalizeTreatmentPlanTimeline
} from '../src/domain/treatment-plan.js';

test('treatment timelines allow the configured month increments and use the requested fallback', () => {
    for (const months of [1, 3, 6, 9, 12]) {
        assert.equal(normalizeTreatmentPlanTimeline(months), months);
    }
    assert.equal(normalizeTreatmentPlanTimeline(2, 12), 12);
});

test('goal and objective start dates inherit from their parent when they are undated', () => {
    const client = { treatmentPlanStartDate: '2026-01-01' };
    const goal = { objectives: [] };
    assert.equal(getGoalTreatmentPlanStartDate(client, goal), '2026-01-01');
    assert.equal(getObjectiveTreatmentPlanStartDate(client, goal, {}), '2026-01-01');
    assert.equal(getObjectiveTreatmentPlanStartDate(client, { startDate: '2026-02-01' }, {}), '2026-02-01');
});

test('month arithmetic clips to the last valid day and crosses calendar years', () => {
    assert.equal(addMonthsToDateInput('2026-01-01', 3), '2026-04-01');
    assert.equal(addMonthsToDateInput('2026-01-31', 1), '2026-02-28');
    assert.equal(addMonthsToDateInput('2026-10-31', 3), '2027-01-31');
});
