export const DEFAULT_SERVICE_TYPE_CPT = '90837';
export const CUSTOM_SERVICE_TYPE_CPT_VALUE = '__custom__';

export const SERVICE_TYPE_CPT_OPTIONS = [
    { value: '90791', label: '90791 — Diagnostic evaluation' },
    { value: '90792', label: '90792 — Diagnostic evaluation with medical services' },
    { value: '90832', label: '90832 — Individual psychotherapy, 30 minutes' },
    { value: '90833', label: '90833 — Psychotherapy add-on, 30 minutes' },
    { value: '90834', label: '90834 — Individual psychotherapy, 45 minutes' },
    { value: '90836', label: '90836 — Psychotherapy add-on, 45 minutes' },
    { value: '90837', label: '90837 — Individual psychotherapy, 60 minutes' },
    { value: '90838', label: '90838 — Psychotherapy add-on, 60 minutes' },
    { value: '90839', label: '90839 — Crisis psychotherapy, initial service' },
    { value: '90840', label: '90840 — Crisis psychotherapy, add-on' },
    { value: '90846', label: '90846 — Family psychotherapy, client not present' },
    { value: '90847', label: '90847 — Family psychotherapy, client present' },
    { value: '90849', label: '90849 — Multiple-family group psychotherapy' },
    { value: '90853', label: '90853 — Group psychotherapy' },
    { value: '90785', label: '90785 — Interactive complexity add-on' }
];

const SERVICE_TYPE_CPT_VALUE_SET = new Set(SERVICE_TYPE_CPT_OPTIONS.map(option => option.value));

export const resolveServiceTypeCptSelection = value => {
    const savedValue = String(value || '');
    if (SERVICE_TYPE_CPT_VALUE_SET.has(savedValue)) {
        return { selection: savedValue, customValue: '' };
    }
    if (savedValue) {
        return { selection: CUSTOM_SERVICE_TYPE_CPT_VALUE, customValue: savedValue };
    }
    return { selection: '', customValue: '' };
};
