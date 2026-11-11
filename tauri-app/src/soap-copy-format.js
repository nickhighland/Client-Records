export const SOAP_COPY_TIME_FIELD_LABELS = [
    ['psychotherapyStartTime', 'Start Time'],
    ['psychotherapyEndTime', 'End Time'],
    ['actualPsychotherapyMinutes', 'Actual Time of Psychotherapy']
];

const SOAP_COPY_TIME_FIELD_KEYS = new Set(SOAP_COPY_TIME_FIELD_LABELS.map(([key]) => key));

export function buildSoapCopySectionBlocks(sectionKeys, values, getSectionLabel = key => key) {
    const orderedKeys = Array.isArray(sectionKeys) ? sectionKeys : [];
    const enabledTimeFields = new Set(orderedKeys.filter(key => SOAP_COPY_TIME_FIELD_KEYS.has(key)));
    const blocks = [];
    let timeBlockAdded = false;

    for (const key of orderedKeys) {
        if (key === 'auditCheck') continue;

        if (key === 'sessionInformation') {
            const sessionInformation = String(values?.sessionInformation ?? '').trim();
            if (sessionInformation) blocks.push(sessionInformation);
            continue;
        }

        if (SOAP_COPY_TIME_FIELD_KEYS.has(key)) {
            if (timeBlockAdded) continue;
            timeBlockAdded = true;
            const timeLines = SOAP_COPY_TIME_FIELD_LABELS
                .filter(([timeKey]) => enabledTimeFields.has(timeKey))
                .map(([timeKey, label]) => {
                    const text = String(values?.[timeKey] ?? '').trim();
                    return text ? `${label}: ${text}` : '';
                })
                .filter(Boolean);
            if (timeLines.length) blocks.push(`Psychotherapy Time\n${timeLines.join('\n')}`);
            continue;
        }

        const text = String(values?.[key] ?? '').trim();
        if (!text) continue;
        blocks.push(`${getSectionLabel(key)}\n${text}`);
    }

    return blocks;
}
