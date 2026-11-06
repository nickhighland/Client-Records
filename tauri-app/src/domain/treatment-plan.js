// Pure treatment-plan date and timeline rules. Dates use local calendar arithmetic.

export const TREATMENT_PLAN_TIMELINE_OPTIONS = Object.freeze([1, 3, 6, 9, 12]);
export const DEFAULT_GOAL_TIMELINE_MONTHS = 12;
export const DEFAULT_OBJECTIVE_TIMELINE_MONTHS = 3;
export const normalizeTreatmentPlanTimeline = (value, fallback = DEFAULT_OBJECTIVE_TIMELINE_MONTHS) => {
    const parsed = Number.parseInt(value, 10);
    return TREATMENT_PLAN_TIMELINE_OPTIONS.includes(parsed) ? parsed : fallback;
};
export const getTreatmentPlanTimelineOptionsMarkup = (selectedValue, fallback = DEFAULT_OBJECTIVE_TIMELINE_MONTHS) => {
    const selected = normalizeTreatmentPlanTimeline(selectedValue, fallback);
    return TREATMENT_PLAN_TIMELINE_OPTIONS
        .map(months => `<option value="${months}" ${months === selected ? 'selected' : ''}>${months} ${months === 1 ? 'month' : 'months'}</option>`)
        .join('');
};
export const parseLocalDateInput = (value) => {
    const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const day = Number.parseInt(match[3], 10);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return { year, month, day };
};
export const isValidDateInputValue = (value) => Boolean(parseLocalDateInput(value));
export const formatPlanDate = (value) => {
    const parts = parseLocalDateInput(value);
    return parts ? `${parts.month}/${parts.day}/${parts.year}` : '';
};
export const addMonthsToDateInput = (value, months) => {
    const parts = parseLocalDateInput(value);
    if (!parts) return '';
    const monthOffset = Math.max(0, Number.parseInt(months, 10) || 0);
    const absoluteMonth = (parts.year * 12) + (parts.month - 1) + monthOffset;
    const targetYear = Math.floor(absoluteMonth / 12);
    const targetMonthIndex = absoluteMonth % 12;
    const lastDayOfTargetMonth = new Date(targetYear, targetMonthIndex + 1, 0).getDate();
    const targetDay = Math.min(parts.day, lastDayOfTargetMonth);
    return `${targetYear}-${String(targetMonthIndex + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
};
export const getClientTreatmentPlanStartDate = (client) => {
    const startDate = client?.treatmentPlanStartDate;
    return isValidDateInputValue(startDate) ? startDate : '';
};
export const getGoalTreatmentPlanStartDate = (client, goal) => {
    if (isValidDateInputValue(goal?.startDate)) return goal.startDate;
    return getClientTreatmentPlanStartDate(client);
};
export const getObjectiveTreatmentPlanStartDate = (client, goal, objective) => {
    if (isValidDateInputValue(objective?.startDate)) return objective.startDate;
    return getGoalTreatmentPlanStartDate(client, goal);
};
export const renderTreatmentPlanDateRange = (startDate, timelineMonths) => {
    if (!isValidDateInputValue(startDate)) return '';
    const normalizedTimeline = Number.parseInt(timelineMonths, 10);
    if (!Number.isFinite(normalizedTimeline) || normalizedTimeline < 1) return '';
    const endDate = addMonthsToDateInput(startDate, normalizedTimeline);
    if (!endDate) return '';
    return `<div class="goal-date-range" title="Calculated as the start date plus the selected timeline"><span>Start ${formatPlanDate(startDate)}</span><span>End ${formatPlanDate(endDate)}</span></div>`;
};
