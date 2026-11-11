export const SOAP_SESSION_INFORMATION_FIELDS = [
    { key: 'client', label: 'Client' },
    { key: 'additionalParticipants', label: 'Additional Participants / Interruptions' },
    { key: 'dateOfService', label: 'Date of Service' },
    { key: 'psychotherapyStartTime', label: 'Start Time' },
    { key: 'psychotherapyEndTime', label: 'End Time' },
    { key: 'actualPsychotherapyMinutes', label: 'Actual Time of Psychotherapy' },
    { key: 'modality', label: 'Modality' },
    { key: 'clientPhysicalLocation', label: "Client's Physical Location" },
    { key: 'serviceTypeCpt', label: 'Service Type / CPT Code' }
];

export const DEFAULT_SOAP_SESSION_INFORMATION_INCLUSION = Object.freeze(
    SOAP_SESSION_INFORMATION_FIELDS.reduce((result, field) => {
        result[field.key] = true;
        return result;
    }, {})
);

export const SOAP_SESSION_INFORMATION_LEGACY_SECTION_TO_FIELD = Object.freeze({
    client: 'client',
    additionalParticipants: 'additionalParticipants',
    dateOfService: 'dateOfService',
    psychotherapyStartTime: 'psychotherapyStartTime',
    psychotherapyEndTime: 'psychotherapyEndTime',
    actualPsychotherapyMinutes: 'actualPsychotherapyMinutes',
    modality: 'modality',
    clientPhysicalLocation: 'clientPhysicalLocation',
    serviceTypeCpt: 'serviceTypeCpt'
});

export const normalizeSoapSessionInformationInclusion = (saved, defaults = DEFAULT_SOAP_SESSION_INFORMATION_INCLUSION) => {
    const savedRecord = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    const defaultRecord = defaults && typeof defaults === 'object' ? defaults : {};
    return SOAP_SESSION_INFORMATION_FIELDS.reduce((result, field) => {
        const fallback = Object.prototype.hasOwnProperty.call(defaultRecord, field.key)
            ? defaultRecord[field.key] !== false
            : true;
        result[field.key] = Object.prototype.hasOwnProperty.call(savedRecord, field.key)
            ? savedRecord[field.key] !== false
            : fallback;
        return result;
    }, {});
};

export const formatSoapSessionInformation = (values = {}, included = DEFAULT_SOAP_SESSION_INFORMATION_INCLUSION) => {
    const selection = normalizeSoapSessionInformationInclusion(included);
    const lines = SOAP_SESSION_INFORMATION_FIELDS
        .filter(field => selection[field.key])
        .map(field => {
            const value = String(values[field.key] ?? '').trim();
            return value ? `${field.label}: ${value}` : '';
        })
        .filter(Boolean);
    return lines.length ? `Session Information:\n${lines.join('\n')}` : '';
};

export const getClientPhysicalLocations = client => {
    const locations = [];
    const homeAddress = String(client?.homeAddress || '').trim();
    if (homeAddress) locations.push({ id: 'home', label: 'Home', address: homeAddress });

    const seenIds = new Set(locations.map(location => location.id));
    (Array.isArray(client?.otherTherapyLocations) ? client.otherTherapyLocations : []).forEach((location, index) => {
        const address = String(location?.address || '').trim();
        if (!address) return;
        let id = String(location?.id || `other-${index + 1}`).trim();
        if (!id || seenIds.has(id)) id = `other-${index + 1}`;
        while (seenIds.has(id)) id = `${id}-${index + 1}`;
        seenIds.add(id);
        locations.push({
            id,
            label: String(location?.label || '').trim() || 'Other',
            address
        });
    });
    return locations;
};

const formatLocation = (label, address) => {
    const name = String(label || '').trim();
    const place = String(address || '').trim();
    return name && place ? `${name}: ${place}` : '';
};

export const resolveSoapPhysicalLocation = (client, sessionFields = {}) => {
    const locations = getClientPhysicalLocations(client);
    const savedId = String(sessionFields.clientPhysicalLocationId || '').trim();
    const legacySnapshot = String(sessionFields.clientPhysicalLocationSnapshot || '').trim();

    if (savedId === 'custom') {
        const label = String(sessionFields.clientPhysicalLocationName || '').trim()
            || (legacySnapshot ? 'Previous Location' : 'Travel / Other');
        const address = String(sessionFields.clientPhysicalLocationAddress || '').trim() || legacySnapshot;
        return { id: 'custom', label, address, text: formatLocation(label, address) };
    }

    if (savedId) {
        const selected = locations.find(location => location.id === savedId);
        if (selected) return { ...selected, text: formatLocation(selected.label, selected.address) };
        if (legacySnapshot) {
            const label = String(sessionFields.clientPhysicalLocationName || '').trim() || 'Previous Location';
            const address = String(sessionFields.clientPhysicalLocationAddress || '').trim() || legacySnapshot;
            return { id: 'custom', label, address, text: formatLocation(label, address) };
        }
    }

    if (legacySnapshot) {
        const label = String(sessionFields.clientPhysicalLocationName || '').trim() || 'Previous Location';
        const address = String(sessionFields.clientPhysicalLocationAddress || '').trim() || legacySnapshot;
        return { id: 'custom', label, address, text: formatLocation(label, address) };
    }

    const defaultLocation = locations.find(location => location.id === 'home') || locations[0];
    return defaultLocation
        ? { ...defaultLocation, text: formatLocation(defaultLocation.label, defaultLocation.address) }
        : { id: '', label: '', address: '', text: '' };
};
