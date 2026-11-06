import { isValidDateInputValue, parseLocalDateInput } from '../../domain/treatment-plan.js';

export const renderSegmentedDateControlMarkup = (valueInputId, value, compact = false) => {
    const inputValue = isValidDateInputValue(value) ? value : '';
    const compactClass = compact ? ' compact' : '';
    return `<div class="segmented-date-control${compactClass}" data-segmented-date-input="${valueInputId}">
        <input id="${valueInputId}Month" class="date-segment date-segment-month" data-date-segment="month" type="text" inputmode="numeric" maxlength="2" placeholder="MM" aria-label="Start date month" autocomplete="off">
        <span class="date-segment-separator" aria-hidden="true">/</span>
        <input class="date-segment date-segment-day" data-date-segment="day" type="text" inputmode="numeric" maxlength="2" placeholder="DD" aria-label="Start date day" autocomplete="off">
        <span class="date-segment-separator" aria-hidden="true">/</span>
        <input class="date-segment date-segment-year" data-date-segment="year" type="text" inputmode="numeric" maxlength="4" placeholder="YYYY" aria-label="Start date year" autocomplete="off">
        <button type="button" class="date-picker-button" data-date-picker-for="${valueInputId}" title="Choose start date" aria-label="Choose start date">📅</button>
        <input id="${valueInputId}" type="date" class="date-input-value" tabindex="-1" aria-hidden="true" value="${inputValue}">
    </div>`;
};
export const getSegmentedDateControl = (valueInputId) => Array.from(document.querySelectorAll('.segmented-date-control'))
    .find(control => control.dataset.segmentedDateInput === valueInputId) || null;
export const getSegmentedDateParts = (control) => ({
    month: control?.querySelector('[data-date-segment="month"]') || null,
    day: control?.querySelector('[data-date-segment="day"]') || null,
    year: control?.querySelector('[data-date-segment="year"]') || null
});
export const syncSegmentedDateInput = (valueInputId, value = null) => {
    const control = getSegmentedDateControl(valueInputId);
    const valueInput = document.getElementById(valueInputId);
    if (!control || !valueInput) return;

    const parts = parseLocalDateInput(value ?? valueInput.value);
    const segments = getSegmentedDateParts(control);
    if (parts) {
        segments.month.value = String(parts.month).padStart(2, '0');
        segments.day.value = String(parts.day).padStart(2, '0');
        segments.year.value = String(parts.year);
    } else {
        segments.month.value = '';
        segments.day.value = '';
        segments.year.value = '';
    }

    const disabled = Boolean(valueInput.disabled);
    Object.values(segments).forEach(segment => {
        if (segment) segment.disabled = disabled;
    });
    const pickerButton = control.querySelector('.date-picker-button');
    if (pickerButton) pickerButton.disabled = disabled;
};
export const focusSegmentedDatePart = (control, partName) => {
    const segment = control?.querySelector(`[data-date-segment="${partName}"]`);
    if (!segment || segment.disabled) return;
    segment.focus();
    segment.select();
};
export const getSegmentedDateCandidate = (control) => {
    const segments = getSegmentedDateParts(control);
    const month = String(segments.month?.value || '').replace(/\D/g, '');
    const day = String(segments.day?.value || '').replace(/\D/g, '');
    const year = String(segments.year?.value || '').replace(/\D/g, '');
    if (month.length !== 2 || day.length !== 2 || year.length !== 4) return '';
    return `${year}-${month}-${day}`;
};
export const updateSegmentedDateInputValue = (control, shouldCommit = false) => {
    const valueInputId = control?.dataset.segmentedDateInput;
    const valueInput = valueInputId ? document.getElementById(valueInputId) : null;
    if (!control || !valueInput || valueInput.disabled) return;

    const candidate = getSegmentedDateCandidate(control);
    if (!shouldCommit || !isValidDateInputValue(candidate)) {
        valueInput.value = '';
        return;
    }

    const previousValue = valueInput.value;
    valueInput.value = candidate;
    syncSegmentedDateInput(valueInputId, candidate);
    if (previousValue !== candidate) {
        valueInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
};
export const handleSegmentedDateInput = (event) => {
    const segment = event.target;
    const control = segment.closest('.segmented-date-control');
    if (!control) return;

    const maxLength = segment.dataset.dateSegment === 'year' ? 4 : 2;
    const digits = String(segment.value || '').replace(/\D/g, '').slice(0, maxLength);
    if (segment.value !== digits) segment.value = digits;
    updateSegmentedDateInputValue(control, segment.dataset.dateSegment !== 'month');

    if (segment.dataset.dateSegment !== 'year' && digits.length === maxLength) {
        const nextPart = segment.dataset.dateSegment === 'month' ? 'day' : 'year';
        focusSegmentedDatePart(control, nextPart);
    }
};
export const handleSegmentedDateKeydown = (event) => {
    const segment = event.target;
    const control = segment.closest('.segmented-date-control');
    if (!control) return;

    const parts = ['month', 'day', 'year'];
    const currentIndex = parts.indexOf(segment.dataset.dateSegment);
    if (currentIndex < 0) return;

    if ((event.key === '/' || event.key === '-') && segment.value) {
        event.preventDefault();
        if (currentIndex < parts.length - 1) focusSegmentedDatePart(control, parts[currentIndex + 1]);
    } else if (event.key === 'ArrowRight' && currentIndex < parts.length - 1) {
        event.preventDefault();
        focusSegmentedDatePart(control, parts[currentIndex + 1]);
    } else if (event.key === 'ArrowLeft' && currentIndex > 0) {
        event.preventDefault();
        focusSegmentedDatePart(control, parts[currentIndex - 1]);
    } else if (event.key === 'Backspace' && !segment.value && currentIndex > 0) {
        event.preventDefault();
        focusSegmentedDatePart(control, parts[currentIndex - 1]);
    }
};
export const initializeSegmentedDateInputs = () => {
    document.querySelectorAll('.segmented-date-control').forEach(control => {
        if (control.dataset.dateNavigationInitialized === 'true') return;
        control.dataset.dateNavigationInitialized = 'true';
        const valueInputId = control.dataset.segmentedDateInput;
        const valueInput = document.getElementById(valueInputId);
        const segments = getSegmentedDateParts(control);

        Object.values(segments).forEach(segment => {
            if (!segment) return;
            segment.addEventListener('focus', () => segment.select());
            segment.addEventListener('keydown', handleSegmentedDateKeydown);
            segment.addEventListener('input', handleSegmentedDateInput);
            segment.addEventListener('blur', event => {
                if (event.relatedTarget && control.contains(event.relatedTarget)) return;
                updateSegmentedDateInputValue(control, true);
            });
        });

        if (valueInput) {
            valueInput.addEventListener('input', () => syncSegmentedDateInput(valueInputId));
            valueInput.addEventListener('change', () => syncSegmentedDateInput(valueInputId));
        }

        const pickerButton = control.querySelector('.date-picker-button');
        if (pickerButton && valueInput) {
            pickerButton.addEventListener('click', () => {
                if (valueInput.disabled) return;
                updateSegmentedDateInputValue(control, true);
                try {
                    if (typeof valueInput.showPicker === 'function') {
                        valueInput.showPicker();
                    } else {
                        valueInput.click();
                    }
                } catch (error) {
                    valueInput.click();
                }
            });
        }

        syncSegmentedDateInput(valueInputId);
    });
};
