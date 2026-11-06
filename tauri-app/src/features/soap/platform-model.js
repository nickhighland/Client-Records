export const SOAP_PLATFORM_SECTION_DEFS = [
    { key: 's', label: 'Subjective', description: 'Client-reported concerns, symptoms, goals, and relevant self-report.' },
    { key: 'o', label: 'Objective', description: 'Observable status, mental-status findings, and documented Writer actions.' },
    { key: 'interventions', label: 'Interventions', description: 'Interventions identified from the organized Objective content.' },
    { key: 'a', label: 'Assessment', description: 'Clinical interpretation, diagnosis and goal linkage, progress, barriers, and risk when supported.' },
    { key: 'p', label: 'Plan', description: 'Documented next steps, follow-up, homework, coordination, or safety planning.' },
    { key: 'diagnosisWithSubstantiation', label: 'Diagnosis with substantiation', description: 'Each clinician-entered diagnosis paired with its saved substantiation in one plain-text block.' },
    { key: 'diagnosisWithoutSubstantiation', label: 'Diagnosis without substantiation', description: 'The clinician-entered diagnosis list without substantiation.' },
    { key: 'presentingProblem', label: 'Presenting Problem', description: 'The Presenting Problem copied directly from the client’s Treatment Goals record.' },
    { key: 'sessionFocus', label: 'Session Focus', description: 'A concise, AI-generated summary of how the presenting problem appeared in this session.' },
    { key: 'treatmentPlan', label: 'Treatment Plan', description: 'Active treatment goals and objectives, with copy controls for the full plan or each item.' },
    { key: 'diagnosticSupport', label: 'Diagnostic Support', description: 'Diagnosis-specific support tied to the current session record.' },
    { key: 'medicalNecessity', label: 'Medical Necessity', description: 'A concise evidence bridge linking the relevant diagnosis and documented session need to continued skilled care.' },
    { key: 'auditCheck', label: 'Audit Check', description: 'The audit-readiness review for the completed SOAP note.' }
];

const SOAP_PLATFORM_SECTION_KEY_SET = new Set(SOAP_PLATFORM_SECTION_DEFS.map(definition => definition.key));
export const SOAP_PLATFORM_DEFAULT_ORDER = SOAP_PLATFORM_SECTION_DEFS.map(definition => definition.key);
export const SOAP_PLATFORM_LEGACY_DEFAULT_ORDER = [
    's', 'o', 'interventions', 'a', 'p',
    'presentingProblem', 'diagnosticSupport', 'medicalNecessity', 'auditCheck'
];
export const SOAP_PLATFORM_NEW_OPTION_KEYS = new Set([
    'diagnosisWithSubstantiation',
    'diagnosisWithoutSubstantiation',
    'sessionFocus',
    'treatmentPlan'
]);
export const SOAP_PLATFORM_DEFAULT_ID = 'standard';

export const createDefaultSoapPlatform = () => ({
    id: SOAP_PLATFORM_DEFAULT_ID,
    name: 'Standard',
    sections: SOAP_PLATFORM_DEFAULT_ORDER.map(key => ({ key, enabled: true }))
});

export const getDefaultSoapPlatforms = () => [createDefaultSoapPlatform()];

export const normalizeSoapPlatformSections = rawSections => {
    const source = Array.isArray(rawSections) ? rawSections : [];
    const hasPersistedSectionOrder = source.length > 0;
    const seen = new Set();
    const normalized = [];

    source.forEach(entry => {
        const key = typeof entry === 'string' ? entry : entry?.key;
        if (!SOAP_PLATFORM_SECTION_KEY_SET.has(key) || seen.has(key)) return;
        seen.add(key);
        normalized.push({
            key,
            enabled: typeof entry === 'object' ? entry.enabled !== false : true
        });
    });

    if (hasPersistedSectionOrder && seen.has('presentingProblem') && !seen.has('sessionFocus')) {
        const presentingProblemIndex = normalized.findIndex(section => section.key === 'presentingProblem');
        const presentingProblemEnabled = normalized[presentingProblemIndex]?.enabled !== false;
        normalized.splice(presentingProblemIndex + 1, 0, {
            key: 'sessionFocus',
            enabled: presentingProblemEnabled
        });
        seen.add('sessionFocus');
    }

    SOAP_PLATFORM_DEFAULT_ORDER.forEach(key => {
        if (seen.has(key)) return;
        normalized.push({
            key,
            // Keep older platform layouts stable until clinicians enable new sections.
            enabled: !hasPersistedSectionOrder || !SOAP_PLATFORM_NEW_OPTION_KEYS.has(key)
        });
    });

    return normalized;
};

export const normalizeSoapPlatformList = platforms => {
    const previous = JSON.stringify(platforms);
    const source = Array.isArray(platforms) ? platforms : [];
    const usedIds = new Set();
    const normalized = source.map((platform, index) => {
        let id = String(platform?.id || '').trim() || `soap-platform-${index + 1}`;
        while (usedIds.has(id)) id = `${id}-${index + 1}`;
        usedIds.add(id);
        const name = String(platform?.name || '').trim() || `Platform ${index + 1}`;
        return {
            id,
            name,
            sections: normalizeSoapPlatformSections(platform?.sections)
        };
    });
    const nextPlatforms = normalized.length > 0 ? normalized : getDefaultSoapPlatforms();
    return {
        platforms: nextPlatforms,
        changed: JSON.stringify(nextPlatforms) !== previous
    };
};

export const findSoapPlatformById = (platforms, platformId) => {
    const id = String(platformId || '').trim();
    if (!id || !Array.isArray(platforms)) return null;
    return platforms.find(platform => platform.id === id) || null;
};

export const findClientSoapPlatform = (platforms, client) => findSoapPlatformById(platforms, client?.soapPlatformId);

export const findDefaultSoapPlatformId = platforms => Array.isArray(platforms) && platforms.length > 0
    ? platforms[0].id
    : '';

export const getSoapPlatformSectionKeysFromList = (platforms, client, useDefaultWhenUnassigned = true) => {
    const platform = findClientSoapPlatform(platforms, client);
    if (!platform) return useDefaultWhenUnassigned ? [...SOAP_PLATFORM_DEFAULT_ORDER] : [];
    return platform.sections.filter(section => section.enabled).map(section => section.key);
};

export const isSoapPlatformSectionEnabledInList = (platforms, client, sectionKey) => {
    const platform = findClientSoapPlatform(platforms, client);
    return !!platform?.sections?.some(section => section.key === sectionKey && section.enabled);
};

export const getSoapPlatformSectionDefinitionByKey = sectionKey =>
    SOAP_PLATFORM_SECTION_DEFS.find(definition => definition.key === sectionKey);

export const createSoapPlatformSnapshot = platform => platform ? ({
    platformId: platform.id,
    platformName: platform.name,
    sections: (platform.sections || []).map(section => ({
        key: section.key,
        enabled: section.enabled !== false
    }))
}) : null;

export const getSoapPlatformSnapshotSectionKeys = snapshot => {
    if (!Array.isArray(snapshot?.sections)) return null;
    const seen = new Set();
    const enabledKeys = [];
    snapshot.sections.forEach(entry => {
        const key = typeof entry === 'string' ? entry : entry?.key;
        if (!SOAP_PLATFORM_SECTION_KEY_SET.has(key) || seen.has(key)) return;
        seen.add(key);
        if (typeof entry === 'string' || entry.enabled !== false) enabledKeys.push(key);
    });
    return enabledKeys;
};

export const getSoapPlatformSectionKeysForAppointmentFromList = (platforms, client, appointment) => {
    const snapshotKeys = getSoapPlatformSnapshotSectionKeys(appointment?.soapPlatformSnapshot);
    if (snapshotKeys) return snapshotKeys;
    const soap = appointment?.soap;
    const hasStoredSoapContent = soap && [
        soap.s,
        soap.o,
        soap.a,
        soap.p,
        soap.interventions,
        soap.presentingProblem,
        soap.sessionFocus,
        soap.clientPresentingProblem,
        soap.diagnosticSupport,
        soap.medicalNecessity
    ].some(value => String(value || '').trim());
    if (!hasStoredSoapContent && findClientSoapPlatform(platforms, client)) {
        return getSoapPlatformSectionKeysFromList(platforms, client, false);
    }
    // Existing appointments predate platform assignment. Keep their legacy layout intact.
    return [...SOAP_PLATFORM_LEGACY_DEFAULT_ORDER];
};
