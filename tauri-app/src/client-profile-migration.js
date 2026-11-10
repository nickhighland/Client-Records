const firstContactValue = (entries) => {
    if (!Array.isArray(entries)) return '';
    for (const entry of entries) {
        const value = typeof entry === 'string' ? entry : entry?.value;
        if (typeof value === 'string' && value.trim()) return value;
    }
    return '';
};

const hasPronounValue = (value) => Boolean(
    (typeof value === 'string' && value.trim())
    || (value && typeof value === 'object' && !Array.isArray(value)
        && ['value', 'subject', 'object', 'possessive'].some(key => String(value[key] || '').trim()))
);

/** Add profile fields from legacy client data without removing or rewriting source values. */
export function migrateClientProfileFields(client) {
    if (!client || typeof client !== 'object') return false;
    let changed = false;
    const legacyImportNeeded = !(Number(client.clientInformationVersion) >= 1);
    const originalName = typeof client.name === 'string' ? client.name : '';
    const nameParts = originalName.trim().split(/\s+/).filter(Boolean);

    if (!client.legacyName && originalName) {
        client.legacyName = originalName;
        changed = true;
    }
    if (legacyImportNeeded && !String(client.firstName || '').trim() && nameParts.length) {
        client.firstName = nameParts[0];
        changed = true;
    }
    if (legacyImportNeeded && !String(client.lastName || '').trim() && nameParts.length > 1) {
        const nameAfterFirst = originalName.trim().slice(nameParts[0].length).trim();
        client.lastName = nameAfterFirst;
        changed = true;
    }

    if (legacyImportNeeded && !String(client.phoneNumber || '').trim()) {
        const phone = firstContactValue(client.contactInfo?.phones)
            || firstContactValue(client.phoneNumbers)
            || firstContactValue(client.phone)
            || (typeof client.phone === 'string' ? client.phone : '');
        if (phone && phone !== client.phoneNumber) {
            client.phoneNumber = phone;
            changed = true;
        }
    }
    if (legacyImportNeeded && !String(client.email || '').trim()) {
        const email = firstContactValue(client.contactInfo?.emails)
            || firstContactValue(client.emailAddresses)
            || firstContactValue(client.email)
            || (typeof client.emailAddress === 'string' ? client.emailAddress : '');
        if (email && email !== client.email) {
            client.email = email;
            changed = true;
        }
    }

    if (legacyImportNeeded && !hasPronounValue(client.pronouns)) {
        const legacyPronouns = client.preferredPronouns
            || client.instructions?.preferredPronouns
            || client.sessionInformation?.preferredPronouns;
        if (hasPronounValue(legacyPronouns)) {
            client.pronouns = typeof legacyPronouns === 'string'
                ? { value: legacyPronouns.trim(), subject: '', object: '', possessive: '' }
                : { ...legacyPronouns };
            changed = true;
        }
    }

    if (legacyImportNeeded && !String(client.dateOfBirth || '').trim() && typeof client.dob === 'string' && client.dob.trim()) {
        client.dateOfBirth = client.dob;
        changed = true;
    }
    if (legacyImportNeeded && !String(client.homeAddress || '').trim()) {
        const legacyAddress = typeof client.address === 'string' ? client.address : client.address?.home;
        if (typeof legacyAddress === 'string' && legacyAddress.trim()) {
            client.homeAddress = legacyAddress;
            changed = true;
        }
    }

    if (legacyImportNeeded && !Array.isArray(client.otherTherapyLocations) && Array.isArray(client.otherLocations)) {
        client.otherTherapyLocations = client.otherLocations.map((location, index) => {
            if (typeof location === 'string') return { id: `legacy-${index}`, label: 'Other', address: location };
            return {
                id: location?.id || `legacy-${index}`,
                label: location?.label || location?.name || 'Other',
                address: location?.address || location?.location || ''
            };
        });
        changed = true;
    }

    if (legacyImportNeeded) {
        client.clientInformationVersion = 1;
        changed = true;
    }

    return changed;
}
