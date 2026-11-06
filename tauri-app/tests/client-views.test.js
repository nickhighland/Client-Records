import test from 'node:test';
import assert from 'node:assert/strict';
import { createClientViews } from '../src/features/clients/client-views.js';

const createElement = () => ({
    value: '',
    textContent: '',
    innerHTML: '',
    disabled: false,
    classList: { toggle() {} },
    appendChild() {},
    setAttribute() {},
    setCustomValidity() {}
});

const createViews = ({ getState, clientsById, normalizeClientData = () => {} }) => {
    const elements = Object.fromEntries([
        'mainBankSearchInput', 'clearMainBankSearchBtn', 'todaySessionsCountEl', 'clearTodaySessionsBtn',
        'mainBankCountEl', 'todaySessionsListEl', 'clientListEl', 'addAppointmentBtn', 'addIntakeBtn',
        'addNoteBtn', 'appointmentListEl', 'noteNameInput', 'updateAppointmentDateBtn', 'renameNoteBtn',
        'clientPhoneListEl', 'clientEmailListEl', 'addPhoneNumberBtn', 'addEmailAddressBtn',
        'addDiagnosisBtn', 'clientDiagnosesListEl'
    ].map(key => [key, createElement()]));
    const views = createClientViews({
        getState,
        normalizeClientData,
        getTodaySessionClients: () => getState().clients.filter(client => client.inToday),
        getMainBankClients: () => getState().clients.filter(client => !client.inToday),
        findClient: id => clientsById[id] || null,
        ensureClientContactInfo: client => client.contactInfo || (client.contactInfo = { phones: [], emails: [] }),
        getClientContactEntryValue: entry => typeof entry === 'string' ? entry : entry?.value || '',
        isClientContactEntryLocked: entry => !!entry?.locked,
        getClientContactValidationMessage: () => '',
        getClientDiagnoses: client => client.diagnoses || [],
        escapeGoalDraftHtml: value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'),
        syncAppointmentDateInput: () => {},
        elements,
        contactIcons: { check: '✓', edit: '✎', copy: '⧉', remove: '×' }
    });
    return { views, elements };
};

test('client list rendering observes normalized client state and search results', () => {
    let clients = [{ id: 'c1', name: 'Old Name' }];
    const clientsById = {};
    const getState = () => ({ selectedClientId: 'c1', clientSearchQuery: '', clients });
    const { views, elements } = createViews({
        getState,
        clientsById,
        normalizeClientData: () => { clients = [{ id: 'c1', name: 'Ct One', inToday: true }]; }
    });

    views.renderClients();
    assert.match(elements.todaySessionsListEl.innerHTML, /Ct One/);
    assert.match(elements.clientListEl.innerHTML, /All active clients are grouped/);
    assert.equal(elements.todaySessionsCountEl.textContent, '1');
});

test('appointment renderer keeps appointment, intake, and note rows associated with the selected client', () => {
    const client = {
        id: 'c1',
        appointments: [{ id: 'a1', date: '2026-01-01T12:00:00.000Z' }],
        intakeSessions: [{ id: 'i1', createdAt: '2026-01-02T12:00:00.000Z' }],
        notes: [{ id: 'n1', name: 'Follow-up', updatedAt: '2026-01-03T12:00:00.000Z' }]
    };
    const state = {
        selectedClientId: 'c1',
        selectedAppointmentId: 'a1',
        selectedIntakeId: 'i1',
        selectedNoteId: 'n1',
        recordViewClearedForSelectedClient: false,
        clients: [client]
    };
    const { views, elements } = createViews({ getState: () => state, clientsById: { c1: client } });

    views.renderAppointments();
    assert.match(elements.appointmentListEl.innerHTML, /data-appointment-id="a1"/);
    assert.match(elements.appointmentListEl.innerHTML, /data-intake-id="i1"/);
    assert.match(elements.appointmentListEl.innerHTML, /data-note-id="n1"/);
    assert.equal(elements.addAppointmentBtn.disabled, false);
});
