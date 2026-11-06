export const createClientRecordEditor = ({
    getState,
    findClient,
    ensureClientContactInfo,
    getClientContactEntryValue,
    getClientContactValidationMessage,
    isClientContactEntryLocked,
    getClientDiagnoses,
    syncLegacyDiagnosisText,
    updateRenderedClientContactValidation,
    markDirty,
    renderDetails,
    clientDiagnosesListEl,
    contactIcons
}) => {
    const findSelectedClient = () => findClient(getState().selectedClientId);
    const CONTACT_ICON_SVGS = contactIcons;

    const addClientContactEntry = (type) => {
        const client = findSelectedClient();
        if (!client) return;

        const contactInfo = ensureClientContactInfo(client);
        const listKey = type === 'emails' ? 'emails' : 'phones';
        contactInfo[listKey].push({ value: '', locked: false });
        markDirty();
        renderDetails();

        setTimeout(() => {
            const input = document.querySelector(`.client-contact-input[data-contact-type="${listKey}"][data-contact-index="${contactInfo[listKey].length - 1}"]`);
            input?.focus();
        }, 0);
    };

    const updateClientContactEntry = (type, index, value) => {
        const client = findSelectedClient();
        if (!client) return;

        const contactInfo = ensureClientContactInfo(client);
        const listKey = type === 'emails' ? 'emails' : 'phones';
        if (!Array.isArray(contactInfo[listKey]) || index < 0 || index >= contactInfo[listKey].length) return;

        const entry = contactInfo[listKey][index];
        if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
            entry.value = String(value ?? '');
        } else {
            contactInfo[listKey][index] = {
                value: String(value ?? ''),
                locked: false
            };
        }
        markDirty();
    };

    const setClientContactLock = (type, index, locked) => {
        const client = findSelectedClient();
        if (!client) return false;

        const contactInfo = ensureClientContactInfo(client);
        const listKey = type === 'emails' ? 'emails' : 'phones';
        if (!Array.isArray(contactInfo[listKey]) || index < 0 || index >= contactInfo[listKey].length) return false;

        const entry = contactInfo[listKey][index];
        const value = getClientContactEntryValue(entry);
        if (locked) {
            const validationMessage = getClientContactValidationMessage(type, value);
            if (validationMessage) {
                updateRenderedClientContactValidation(type, index, value);
                document.querySelector(`.client-contact-input[data-contact-type="${type}"][data-contact-index="${index}"]`)?.focus();
                return false;
            }
        }

        entry.locked = !!locked;
        markDirty();
        renderDetails();
        if (!locked) {
            setTimeout(() => {
                document.querySelector(`.client-contact-input[data-contact-type="${type}"][data-contact-index="${index}"]`)?.focus();
            }, 0);
        }
        return true;
    };

    const editClientContactEntry = (type, index) => {
        const client = findSelectedClient();
        if (!client) return;

        const contactInfo = ensureClientContactInfo(client);
        const listKey = type === 'emails' ? 'emails' : 'phones';
        const entry = contactInfo[listKey]?.[index];
        if (!entry) return;

        if (isClientContactEntryLocked(entry)) {
            setClientContactLock(type, index, false);
            return;
        }

        document.querySelector(`.client-contact-input[data-contact-type="${type}"][data-contact-index="${index}"]`)?.focus();
    };

    const setClientContactCopyButtonFeedback = (button, label, copied) => {
        if (!button) return;
        button.innerHTML = copied ? CONTACT_ICON_SVGS.check : CONTACT_ICON_SVGS.copy;
        button.title = copied ? `${label} copied` : `Copy ${label}`;
        button.setAttribute('aria-label', button.title);
    };

    const copyClientContactEntry = async (type, index, button) => {
        const client = findSelectedClient();
        if (!client) return;

        const contactInfo = ensureClientContactInfo(client);
        const listKey = type === 'emails' ? 'emails' : 'phones';
        const entry = contactInfo[listKey]?.[index];
        const value = getClientContactEntryValue(entry);
        const label = type === 'emails' ? 'Email address' : 'Phone number';
        if (!value) {
            alert(`There is no ${label.toLowerCase()} to copy.`);
            return;
        }

        try {
            await navigator.clipboard.writeText(value);
            setClientContactCopyButtonFeedback(button, label, true);
            window.setTimeout(() => {
                if (button.isConnected) setClientContactCopyButtonFeedback(button, label, false);
            }, 2000);
        } catch (error) {
            console.error(`Failed to copy ${label.toLowerCase()}:`, error);
            alert(`Could not copy the ${label.toLowerCase()}.`);
        }
    };

    const removeClientContactEntry = (type, index) => {
        const client = findSelectedClient();
        if (!client) return;

        const contactInfo = ensureClientContactInfo(client);
        const listKey = type === 'emails' ? 'emails' : 'phones';
        if (!Array.isArray(contactInfo[listKey]) || index < 0 || index >= contactInfo[listKey].length) return;

        contactInfo[listKey].splice(index, 1);
        markDirty();
        renderDetails();
    };

    const addClientDiagnosis = () => {
        const client = findSelectedClient();
        if (!client || getState().recordViewClearedForSelectedClient) return;
        const diagnoses = getClientDiagnoses(client);
        const existingEmpty = diagnoses.find(entry => !String(entry.name || '').trim());
        if (existingEmpty) {
            const existingInput = [...clientDiagnosesListEl.querySelectorAll('.client-diagnosis-input')]
                .find(input => input.dataset.diagnosisId === existingEmpty.id);
            existingInput?.focus();
            return;
        }

        const diagnosis = { id: crypto.randomUUID(), name: '' };
        diagnoses.push(diagnosis);
        syncLegacyDiagnosisText(client);
        markDirty();
        renderDetails();
        const newInput = [...clientDiagnosesListEl.querySelectorAll('.client-diagnosis-input')]
            .find(input => input.dataset.diagnosisId === diagnosis.id);
        newInput?.focus();
    };

    const removeClientDiagnosis = (diagnosisId) => {
        const client = findSelectedClient();
        if (!client || !diagnosisId) return;
        const diagnoses = getClientDiagnoses(client);
        const index = diagnoses.findIndex(entry => entry.id === diagnosisId);
        if (index < 0) return;

        diagnoses.splice(index, 1);
        syncLegacyDiagnosisText(client);
        markDirty();
        renderDetails();
    };

    const updateClientDiagnosis = (diagnosisId, value) => {
        const client = findSelectedClient();
        if (!client || !diagnosisId) return;
        const diagnosis = getClientDiagnoses(client).find(entry => entry.id === diagnosisId);
        if (!diagnosis) return;

        diagnosis.name = String(value ?? '');
        syncLegacyDiagnosisText(client);
        markDirty();
    };

    const updateClientDiagnosisSubstantiation = (diagnosisId, value) => {
        const client = findSelectedClient();
        if (!client || !diagnosisId) return;
        const diagnosis = getClientDiagnoses(client).find(entry => entry.id === diagnosisId);
        if (!diagnosis) return;

        diagnosis.substantiation = String(value ?? '');
        markDirty();
    };

    return {
        addClientContactEntry,
        updateClientContactEntry,
        setClientContactLock,
        editClientContactEntry,
        copyClientContactEntry,
        removeClientContactEntry,
        addClientDiagnosis,
        removeClientDiagnosis,
        updateClientDiagnosis,
        updateClientDiagnosisSubstantiation
    };
};
