export const MENTAL_STATUS_EXAM_FIELDS = [
    {
        key: 'appearance',
        label: 'Appearance',
        normal: 'Appropriate grooming and attire',
        options: ['Appropriate grooming and attire', 'Disheveled', 'Unkempt', 'Unusual attire', 'Other', 'Not assessed']
    },
    {
        key: 'behavior',
        label: 'Behavior',
        normal: 'Cooperative and engaged',
        options: ['Cooperative and engaged', 'Guarded', 'Withdrawn', 'Agitated', 'Restless', 'Other', 'Not assessed']
    },
    {
        key: 'speech',
        label: 'Speech',
        normal: 'Normal rate, volume, and tone',
        options: ['Normal rate, volume, and tone', 'Rapid', 'Pressured', 'Slowed', 'Soft', 'Loud', 'Other', 'Not assessed']
    },
    {
        key: 'mood',
        label: 'Mood',
        normal: 'Euthymic / stable',
        options: ['Euthymic / stable', 'Anxious', 'Depressed', 'Irritable', 'Elevated', 'Other', 'Not assessed']
    },
    {
        key: 'affect',
        label: 'Affect',
        normal: 'Appropriate and congruent',
        options: ['Appropriate and congruent', 'Restricted', 'Flat', 'Labile', 'Incongruent', 'Other', 'Not assessed']
    },
    {
        key: 'thoughtProcess',
        label: 'Thought Process',
        normal: 'Linear and goal directed',
        options: ['Linear and goal directed', 'Circumstantial', 'Tangential', 'Flight of ideas', 'Disorganized', 'Other', 'Not assessed']
    },
    {
        key: 'thoughtContent',
        label: 'Thought Content',
        normal: 'No unusual content reported or observed',
        options: ['No unusual content reported or observed', 'Worry / rumination', 'Obsessions', 'Delusions', 'Preoccupation', 'Other', 'Not assessed']
    },
    {
        key: 'perception',
        label: 'Perception',
        normal: 'No perceptual disturbance reported or observed',
        options: ['No perceptual disturbance reported or observed', 'Auditory disturbance', 'Visual disturbance', 'Other disturbance', 'Not assessed']
    },
    {
        key: 'cognition',
        label: 'Cognition / Orientation',
        normal: 'Alert and oriented to person, place, time, and situation',
        options: ['Alert and oriented to person, place, time, and situation', 'Disoriented', 'Attention concern', 'Memory concern', 'Other', 'Not assessed']
    },
    {
        key: 'motor',
        label: 'Motor Activity',
        normal: 'Within normal limits',
        options: ['Within normal limits', 'Psychomotor slowing', 'Restlessness', 'Tremor', 'Abnormal movements', 'Other', 'Not assessed']
    },
    {
        key: 'insight',
        label: 'Insight',
        normal: 'Good',
        options: ['Good', 'Fair', 'Limited', 'Other', 'Not assessed']
    },
    {
        key: 'judgment',
        label: 'Judgment',
        normal: 'Good',
        options: ['Good', 'Fair', 'Poor', 'Other', 'Not assessed']
    },
    {
        key: 'safety',
        label: 'Safety / Risk',
        normal: 'No safety concerns reported or observed',
        options: ['No safety concerns reported or observed', 'Suicidal thoughts reported', 'Homicidal thoughts reported', 'Other concern', 'Not assessed']
    }
];

export const createNormalMentalStatusExam = () => Object.fromEntries(
    MENTAL_STATUS_EXAM_FIELDS.map(field => [field.key, field.normal])
);

export const isMentalStatusExamComplete = (exam) => Boolean(exam)
    && MENTAL_STATUS_EXAM_FIELDS.every(field => String(exam[field.key] || '').trim().length > 0);

export const formatMentalStatusExam = (exam) => {
    if (!exam || typeof exam !== 'object') return '';
    const findings = MENTAL_STATUS_EXAM_FIELDS
        .map(field => {
            const value = String(exam[field.key] || '').trim();
            if (!value) return '';
            return `${field.label}: ${value}`;
        })
        .filter(Boolean);
    const additionalNotes = String(exam.additionalNotes || '').trim();
    if (additionalNotes) findings.push(`Additional Notes: ${additionalNotes}`);
    return findings.join('\n');
};
