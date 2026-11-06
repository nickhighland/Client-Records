// Client-record normalization and input rules. Existing saved values remain unchanged.

export const normalizeClientContactEntries = (entries) => {
    const rawEntries = Array.isArray(entries)
        ? entries
        : (typeof entries === 'string' && entries.length ? [entries] : []);

    return rawEntries.map(entry => {
        if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
            const rawValue = Object.prototype.hasOwnProperty.call(entry, 'value')
                ? entry.value
                : (entry.number ?? entry.phone ?? entry.email ?? entry.address ?? '');
            return {
                // Preserve the stored value exactly during migration. Formatting is
                // applied only to values entered after this feature is enabled.
                value: String(rawValue ?? ''),
                locked: entry.locked !== false
            };
        }

        return {
            value: String(entry ?? ''),
            locked: true
        };
    });
};
export const getClientContactEntryValue = (entry) => {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        return String(entry.value ?? '');
    }
    return String(entry ?? '');
};
export const isClientContactEntryLocked = (entry) => {
    return !(entry && typeof entry === 'object' && !Array.isArray(entry)) || entry.locked !== false;
};
export const formatClientPhoneInput = (value) => {
    const digits = String(value ?? '').replace(/\D/g, '').slice(0, 10);
    if (!digits) return '';
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};
export const CLIENT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const getClientContactValidationMessage = (type, value) => {
    const normalizedValue = String(value ?? '').trim();
    if (!normalizedValue) return '';
    if (type === 'phones' && !/^\(\d{3}\) \d{3}-\d{4}$/.test(normalizedValue)) {
        return 'Enter a 10-digit phone number.';
    }
    if (type === 'emails' && !CLIENT_EMAIL_PATTERN.test(normalizedValue)) {
        return 'Enter an email address containing @ and a period (.).';
    }
    return '';
};
export const ensureClientContactInfo = (client) => {
    if (!client || typeof client !== 'object') {
        return { phones: [], emails: [] };
    }
    if (!client.contactInfo || typeof client.contactInfo !== 'object') {
        client.contactInfo = {};
    }
    if (!Array.isArray(client.contactInfo.phones)) {
        client.contactInfo.phones = normalizeClientContactEntries(client.phoneNumbers ?? client.phone ?? []);
    }
    if (!Array.isArray(client.contactInfo.emails)) {
        client.contactInfo.emails = normalizeClientContactEntries(client.emailAddresses ?? client.email ?? []);
    }
    client.contactInfo.phones = normalizeClientContactEntries(client.contactInfo.phones);
    client.contactInfo.emails = normalizeClientContactEntries(client.contactInfo.emails);
    return client.contactInfo;
};
export const normalizeDiagnosisEntry = (entry) => {
    const isObject = entry && typeof entry === 'object';
    const rawName = isObject
        ? (entry.name ?? entry.diagnosis ?? entry.text ?? entry.label ?? '')
        : entry;
    const name = String(rawName ?? '').trim();
    const id = isObject && typeof entry.id === 'string' && entry.id.trim()
        ? entry.id.trim()
        : crypto.randomUUID();
    const substantiation = isObject ? String(entry.substantiation ?? '').trim() : '';
    return { id, name, substantiation };
};
export const normalizeClientDiagnoses = (client) => {
    if (!client || typeof client !== 'object') return false;

    const previousDiagnoses = client.diagnoses;
    const previousLegacyDiagnosis = typeof client.diagnosis === 'string' ? client.diagnosis : '';
    const hasUsableDiagnosisList = Array.isArray(previousDiagnoses)
        && previousDiagnoses.some(entry => {
            const isObject = entry && typeof entry === 'object';
            const rawName = isObject
                ? (entry.name ?? entry.diagnosis ?? entry.text ?? entry.label ?? '')
                : entry;
            return String(rawName ?? '').trim();
        });
    const source = Array.isArray(previousDiagnoses)
        && (hasUsableDiagnosisList || !previousLegacyDiagnosis.trim())
        ? previousDiagnoses
        : (previousLegacyDiagnosis.trim()
            ? previousLegacyDiagnosis.split(/\r?\n/).map(value => value.replace(/^\s*[-*\u2022]\s*/, ''))
            : []);
    const seenIds = new Set();
    const normalized = source
        .map(normalizeDiagnosisEntry)
        .map(entry => {
            if (seenIds.has(entry.id)) entry.id = crypto.randomUUID();
            seenIds.add(entry.id);
            return entry;
        });
    const legacyDiagnosis = normalized
        .map(entry => entry.name)
        .filter(Boolean)
        .join('\n');
    const changed = JSON.stringify(previousDiagnoses) !== JSON.stringify(normalized)
        || previousLegacyDiagnosis !== legacyDiagnosis;

    client.diagnoses = normalized;
    client.diagnosis = legacyDiagnosis;
    return changed;
};
export const getClientDiagnoses = (client) => {
    if (!client || typeof client !== 'object') return [];
    const needsNormalization = !Array.isArray(client.diagnoses)
        || client.diagnoses.some(entry => !entry || typeof entry !== 'object'
            || typeof entry.id !== 'string'
            || typeof entry.name !== 'string'
            || typeof entry.substantiation !== 'string');
    if (needsNormalization) normalizeClientDiagnoses(client);
    return Array.isArray(client.diagnoses) ? client.diagnoses : [];
};
export const syncLegacyDiagnosisText = (client) => {
    if (!client) return;
    client.diagnosis = getClientDiagnoses(client)
        .map(entry => String(entry.name || '').trim())
        .filter(Boolean)
        .join('\n');
};
export const parseTreatmentPlanDiagnosisEntries = (value) => {
    return String(value ?? '')
        .split(/\r?\n[ \t]*\r?\n+/)
        .map(block => block.split(/\r?\n/).map(line => line.trim()).filter(Boolean))
        .filter(lines => lines.length > 0)
        .map(([name, ...substantiationLines]) => ({
            name,
            substantiation: substantiationLines.join('\n')
        }))
        .filter(entry => entry.name);
};
export const formatTreatmentPlanDiagnosisEntries = (client) => {
    const diagnoses = (Array.isArray(client?.diagnoses) ? client.diagnoses : [])
        .map(entry => {
            const source = entry && typeof entry === 'object' ? entry : {};
            const name = entry && typeof entry === 'object'
                ? (source.name ?? source.diagnosis ?? source.text ?? source.label ?? '')
                : entry;
            return {
                name: String(name ?? '').trim(),
                substantiation: String(source.substantiation ?? '').trim()
            };
        })
        .filter(entry => entry.name);
    const entries = diagnoses.length > 0
        ? diagnoses
        : String(client?.diagnosis ?? '')
            .split(/\r?\n/)
            .map(name => name.replace(/^\s*[-*\u2022]\s*/, '').trim())
            .filter(Boolean)
            .map(name => ({ name, substantiation: '' }));

    return entries.map(({ name, substantiation }) => {
        const diagnosisName = String(name || '').trim();
        const diagnosisSubstantiation = String(substantiation || '').trim();
        return diagnosisSubstantiation
            ? `${diagnosisName}\n${diagnosisSubstantiation}`
            : diagnosisName;
    }).join('\n\n');
};
export const normalizeClientSessionType = (value) => {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized === 'family' || normalized === 'families') return 'family';
    return normalized === 'couple' || normalized === 'couples' ? 'couple' : 'individual';
};
export const getClientSessionType = (client) => normalizeClientSessionType(client?.sessionType ?? client?.clientType);
export const hasAssignedClientSessionType = (client) => client?.sessionTypeAssigned === true;
export const isCoupleClient = (client) => getClientSessionType(client) === 'couple';
export const normalizePreferredPronounRecord = (value) => {
    const source = value && typeof value === 'object' ? value : {};
    return {
        value: typeof source.value === 'string' ? source.value.trim() : '',
        subject: typeof source.subject === 'string' ? source.subject.trim() : '',
        object: typeof source.object === 'string' ? source.object.trim() : '',
        possessive: typeof source.possessive === 'string' ? source.possessive.trim() : ''
    };
};
export const createEmptySessionMember = () => ({
    id: crypto.randomUUID(),
    name: '',
    role: '',
    preferredPronouns: normalizePreferredPronounRecord()
});
export const normalizeSessionMembers = (value) => {
    const source = Array.isArray(value) ? value : [];
    const usedIds = new Set();
    return source.map((member, index) => {
        const sourceMember = member && typeof member === 'object' ? member : {};
        let id = typeof sourceMember.id === 'string' ? sourceMember.id.trim() : '';
        while (!id || usedIds.has(id)) id = crypto.randomUUID();
        usedIds.add(id);
        return {
            id,
            name: typeof sourceMember.name === 'string' ? sourceMember.name.trim() : '',
            role: typeof sourceMember.role === 'string' ? sourceMember.role.trim() : '',
            preferredPronouns: normalizePreferredPronounRecord(sourceMember.preferredPronouns ?? sourceMember.pronouns)
        };
    });
};
export const getClientSessionMembers = (client) => Array.isArray(client?.sessionMembers) ? client.sessionMembers : [];
