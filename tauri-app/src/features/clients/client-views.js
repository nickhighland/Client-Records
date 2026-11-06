export const createClientViews = ({
    getState,
    normalizeClientData,
    getTodaySessionClients,
    getMainBankClients,
    findClient,
    ensureClientContactInfo,
    getClientContactEntryValue,
    isClientContactEntryLocked,
    getClientContactValidationMessage,
    getClientDiagnoses,
    escapeGoalDraftHtml,
    syncAppointmentDateInput,
    elements,
    contactIcons
}) => {
    const {
        mainBankSearchInput,
        clearMainBankSearchBtn,
        todaySessionsCountEl,
        clearTodaySessionsBtn,
        mainBankCountEl,
        todaySessionsListEl,
        clientListEl,
        addAppointmentBtn,
        addIntakeBtn,
        addNoteBtn,
        appointmentListEl,
        noteNameInput,
        updateAppointmentDateBtn,
        renameNoteBtn,
        clientPhoneListEl,
        clientEmailListEl,
        addPhoneNumberBtn,
        addEmailAddressBtn,
        addDiagnosisBtn,
        clientDiagnosesListEl
    } = elements;
    const CONTACT_ICON_SVGS = contactIcons;

    const renderClients = () => {
        normalizeClientData();
        const { selectedClientId, clientSearchQuery, clients } = getState();

        const renderClientCard = (client, listType, todayIndex = null) => `
            <div class="client-item ${client.id === selectedClientId ? 'active' : ''}" data-client-id="${client.id}" data-list-type="${listType}">
                <div class="client-item-main">
                    <div class="client-item-leading">
                        ${listType === 'today' ? `<span class="today-session-rank">${todayIndex + 1}</span>` : ''}
                        <span class="client-name-label">${client.name || 'Untitled Client'}</span>
                    </div>
                </div>
                <div class="action-buttons client-action-buttons">
                    <button class="action-btn edit-btn" title="Edit Name">✏️</button>
                    <button class="action-btn archive-btn" title="Archive Client">A</button>
                    <button class="action-btn delete-btn" title="Delete Client">×</button>
                </div>
                <button class="today-session-btn" type="button" title="${listType === 'today' ? 'Move back to Main Bank' : "Move to bottom of Today's Sessions"}" aria-label="${listType === 'today' ? 'Move back to Main Bank' : "Move to bottom of Today's Sessions"}">${listType === 'today' ? 'M' : 'T'}</button>
            </div>
        `;

        const todayClients = getTodaySessionClients();
        const mainBankClients = getMainBankClients();
        const searchQuery = clientSearchQuery.trim().toLowerCase();
        const filteredMainBankClients = searchQuery
            ? mainBankClients.filter(client => String(client.name || '').toLowerCase().includes(searchQuery))
            : mainBankClients;

        if (mainBankSearchInput.value !== clientSearchQuery) {
            mainBankSearchInput.value = clientSearchQuery;
        }
        clearMainBankSearchBtn.classList.toggle('hidden', !clientSearchQuery);
        todaySessionsCountEl.textContent = String(todayClients.length);
        clearTodaySessionsBtn.disabled = todayClients.length === 0;

        const mainBankCountLabel = searchQuery
            ? `${filteredMainBankClients.length} of ${mainBankClients.length} clients`
            : `${mainBankClients.length} client${mainBankClients.length === 1 ? '' : 's'}`;
        mainBankCountEl.textContent = mainBankCountLabel;

        todaySessionsListEl.innerHTML = todayClients.length > 0
            ? todayClients.map((client, index) => renderClientCard(client, 'today', index)).join('')
            : "<div class=\"client-empty-state\">Drag clients from Main Bank here to build today's queue.</div>";

        if (filteredMainBankClients.length > 0) {
            clientListEl.innerHTML = filteredMainBankClients.map(client => renderClientCard(client, 'main')).join('');
            return;
        }

        if ((clients || []).length === 0) {
            clientListEl.innerHTML = '<div class="no-selection">Click + to add a client</div>';
            return;
        }

        if (searchQuery) {
            clientListEl.innerHTML = '<div class="client-empty-state">No clients match this search.</div>';
            return;
        }

        clientListEl.innerHTML = "<div class=\"client-empty-state\">All active clients are grouped in Today's Sessions.</div>";
    };

    const renderAppointments = () => {
        const { selectedClientId, selectedAppointmentId, selectedNoteId, selectedIntakeId, recordViewClearedForSelectedClient } = getState();
        const client = findClient(selectedClientId);
        addAppointmentBtn.disabled = !client || recordViewClearedForSelectedClient;
        addIntakeBtn.disabled = !client || recordViewClearedForSelectedClient;
        addNoteBtn.disabled = !client || recordViewClearedForSelectedClient;
        if (recordViewClearedForSelectedClient) {
            appointmentListEl.innerHTML = '';
            syncAppointmentDateInput();
            noteNameInput.value = '';
            updateAppointmentDateBtn.disabled = true;
            renameNoteBtn.disabled = true;
            return;
        }
        syncAppointmentDateInput();
        if (!client) {
            appointmentListEl.innerHTML = '<div class="no-selection">Select a client first</div>';
            return;
        }

        if (!Array.isArray(client.notes)) client.notes = [];
        if (!Array.isArray(client.intakeSessions)) client.intakeSessions = [];
        const appointments = (client.appointments || []).sort((a, b) => new Date(b.date) - new Date(a.date));
        const notes = (client.notes || []).slice().sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
        const intakeSessions = (client.intakeSessions || []).slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        if (appointments.length === 0 && intakeSessions.length === 0 && notes.length === 0) {
            appointmentListEl.innerHTML = '<div class="no-selection">Click + to add appointment, intake session, or note</div>';
            return;
        }

        const appointmentsHtml = appointments.length > 0 ? `
            <div class="list-subheader">Appointments</div>
            ${appointments.map(appt => `
                <div class="appointment-item ${appt.id === selectedAppointmentId ? 'active' : ''}" data-appointment-id="${appt.id}">
                    <div class="appointment-date">${new Date(appt.date).toLocaleDateString()}</div>
                    <div class="action-buttons">
                        <button class="action-btn delete-btn" title="Delete Appointment">×</button>
                    </div>
                </div>
            `).join('')}
        ` : '';

        const notesHtml = notes.length > 0 ? `
            <div class="list-subheader">Notes</div>
            ${notes.map(note => `
                <div class="note-item ${note.id === selectedNoteId ? 'active' : ''}" data-note-id="${note.id}">
                    <div class="note-name">📝 ${note.name}</div>
                    <div class="action-buttons">
                        <button class="action-btn edit-btn" title="Rename Note">✏️</button>
                        <button class="action-btn delete-btn" title="Delete Note">×</button>
                    </div>
                </div>
            `).join('')}
        ` : '';

        const intakeHtml = intakeSessions.length > 0 ? `
            <div class="list-subheader">Intake Sessions</div>
            ${intakeSessions.map(intake => `
                <div class="intake-item ${intake.id === selectedIntakeId ? 'active' : ''}" data-intake-id="${intake.id}">
                    <div class="note-name">📋 Intake Session ${new Date(intake.createdAt).toLocaleDateString()}</div>
                    <div class="action-buttons">
                        <button class="action-btn delete-btn" title="Delete Intake Session">×</button>
                    </div>
                </div>
            `).join('')}
        ` : '';

        appointmentListEl.innerHTML = `${appointmentsHtml}${intakeHtml}${notesHtml}`;
    };

    const buildContactEmptyState = (message) => {
        const emptyState = document.createElement('div');
        emptyState.style.fontSize = '0.8rem';
        emptyState.style.color = 'var(--text-color-secondary)';
        emptyState.style.padding = '10px 12px';
        emptyState.style.border = '1px dashed var(--panel-border)';
        emptyState.style.borderRadius = '8px';
        emptyState.style.background = 'var(--input-bg)';
        emptyState.textContent = message;
        return emptyState;
    };

    const renderClientContactFields = (client) => {
        if (!clientPhoneListEl || !clientEmailListEl) return;

        const disabled = !client;
        const contactInfo = client ? ensureClientContactInfo(client) : { phones: [], emails: [] };

        const renderContactList = (listEl, entries, config) => {
            listEl.innerHTML = '';

            if (!client) {
                listEl.appendChild(buildContactEmptyState(config.selectPrompt));
                return;
            }

            if (!entries.length) {
                listEl.appendChild(buildContactEmptyState(config.emptyPrompt));
                return;
            }

            entries.forEach((entry, index) => {
                const row = document.createElement('div');
                row.className = 'client-contact-row';
                row.dataset.contactType = config.type;
                row.dataset.contactIndex = String(index);

                const entryValue = getClientContactEntryValue(entry);
                const locked = isClientContactEntryLocked(entry);
                const validationMessage = !locked
                    ? getClientContactValidationMessage(config.type, entryValue)
                    : '';

                const input = document.createElement('input');
                input.type = config.inputType;
                input.className = 'setting-input client-contact-input';
                input.placeholder = config.placeholder;
                input.value = entryValue;
                input.disabled = disabled || locked;
                input.dataset.contactType = config.type;
                input.dataset.contactIndex = String(index);
                input.inputMode = config.type === 'phones' ? 'tel' : 'email';
                input.autocomplete = config.type === 'phones' ? 'tel' : 'email';
                input.maxLength = config.type === 'phones' ? 14 : 254;
                input.setAttribute('aria-label', `${config.label} ${index + 1}`);
                input.setAttribute('aria-invalid', validationMessage ? 'true' : 'false');
                input.setCustomValidity(validationMessage);

                const editLockBtn = document.createElement('button');
                editLockBtn.type = 'button';
                editLockBtn.className = locked
                    ? 'client-contact-icon-btn client-contact-edit-btn'
                    : 'client-contact-icon-btn client-contact-lock-btn';
                editLockBtn.innerHTML = locked ? CONTACT_ICON_SVGS.edit : CONTACT_ICON_SVGS.check;
                editLockBtn.title = locked ? 'Edit contact entry' : 'Save contact entry';
                editLockBtn.setAttribute('aria-label', editLockBtn.title);
                editLockBtn.disabled = disabled;
                editLockBtn.dataset.contactType = config.type;
                editLockBtn.dataset.contactIndex = String(index);

                const copyBtn = document.createElement('button');
                copyBtn.type = 'button';
                copyBtn.className = 'client-contact-icon-btn client-contact-copy-btn';
                copyBtn.innerHTML = CONTACT_ICON_SVGS.copy;
                copyBtn.title = `Copy ${config.label.toLowerCase()}`;
                copyBtn.setAttribute('aria-label', copyBtn.title);
                copyBtn.disabled = disabled;
                copyBtn.dataset.contactType = config.type;
                copyBtn.dataset.contactIndex = String(index);

                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'client-contact-icon-btn client-contact-remove-btn';
                removeBtn.innerHTML = CONTACT_ICON_SVGS.remove;
                removeBtn.title = `Remove ${config.label.toLowerCase()}`;
                removeBtn.setAttribute('aria-label', removeBtn.title);
                removeBtn.disabled = disabled;
                removeBtn.dataset.contactType = config.type;
                removeBtn.dataset.contactIndex = String(index);

                const validation = document.createElement('div');
                validation.className = 'client-contact-validation';
                validation.setAttribute('role', 'alert');
                validation.textContent = validationMessage;
                validation.style.display = validationMessage ? 'block' : 'none';

                row.appendChild(editLockBtn);
                row.appendChild(input);
                row.appendChild(removeBtn);
                row.appendChild(copyBtn);
                row.appendChild(validation);
                listEl.appendChild(row);
            });
        };

        renderContactList(clientPhoneListEl, contactInfo.phones, {
            type: 'phones',
            label: 'Phone number',
            inputType: 'tel',
            placeholder: 'Enter phone number',
            selectPrompt: 'Select a client to add phone numbers.',
            emptyPrompt: 'No phone numbers saved yet.',
        });

        renderContactList(clientEmailListEl, contactInfo.emails, {
            type: 'emails',
            label: 'Email address',
            inputType: 'email',
            placeholder: 'Enter email address',
            selectPrompt: 'Select a client to add email addresses.',
            emptyPrompt: 'No email addresses saved yet.',
        });

        if (addPhoneNumberBtn) addPhoneNumberBtn.disabled = disabled;
        if (addEmailAddressBtn) addEmailAddressBtn.disabled = disabled;
    };

    const updateRenderedClientContactValidation = (type, index, value) => {
        const row = document.querySelector(`.client-contact-row[data-contact-type="${type}"][data-contact-index="${index}"]`);
        if (!row) return;
        const input = row.querySelector('.client-contact-input');
        const validation = row.querySelector('.client-contact-validation');
        const message = getClientContactValidationMessage(type, value);
        if (input) {
            input.setCustomValidity(message);
            input.setAttribute('aria-invalid', message ? 'true' : 'false');
        }
        if (validation) {
            validation.textContent = message;
            validation.style.display = message ? 'block' : 'none';
        }
    };

    const renderClientDiagnoses = (client) => {
        if (!client) {
            addDiagnosisBtn.disabled = true;
            clientDiagnosesListEl.innerHTML = '<div class="no-selection">Select a client to manage diagnoses</div>';
            return;
        }

        addDiagnosisBtn.disabled = false;
        const diagnoses = getClientDiagnoses(client);
        if (diagnoses.length === 0) {
            clientDiagnosesListEl.innerHTML = '<div class="no-selection">No diagnoses recorded. Click + Add diagnosis.</div>';
            return;
        }

        clientDiagnosesListEl.innerHTML = diagnoses.map((diagnosis, index) => {
            const label = diagnosis.name.trim() || `Diagnosis ${index + 1}`;
            const escapedId = escapeGoalDraftHtml(diagnosis.id);
            const escapedLabel = escapeGoalDraftHtml(label);
            return `
                <div class="client-diagnosis-row" data-diagnosis-id="${escapedId}">
                    <div class="client-diagnosis-fields">
                        <input type="text" class="client-diagnosis-input" data-diagnosis-id="${escapedId}" value="${escapeGoalDraftHtml(diagnosis.name)}" placeholder="e.g., Generalized Anxiety Disorder (F41.1)" aria-label="${escapedLabel}">
                        <label class="client-diagnosis-substantiation-label">Substantiation</label>
                        <textarea class="client-diagnosis-substantiation" data-diagnosis-id="${escapedId}" rows="3" placeholder="Document the criteria and clinical evidence supporting this diagnosis." aria-label="Substantiation for ${escapedLabel}" spellcheck="true">${escapeGoalDraftHtml(diagnosis.substantiation)}</textarea>
                    </div>
                    <button type="button" class="remove-client-diagnosis-btn" data-diagnosis-id="${escapedId}" title="Remove diagnosis" aria-label="Remove ${escapedLabel}">&times;</button>
                </div>
            `;
        }).join('');
    };

    return { renderClients, renderAppointments, renderClientContactFields, updateRenderedClientContactValidation, renderClientDiagnoses };
};
