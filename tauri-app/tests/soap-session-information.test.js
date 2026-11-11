import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
    SOAP_SESSION_INFORMATION_FIELDS,
    areSoapSessionInformationValuesComplete,
    formatSoapSessionInformation,
    getClientPhysicalLocations,
    normalizeSoapSessionInformationInclusion,
    resolveSoapPhysicalLocation
} from '../src/soap-session-information.js';

test('Session Information emits checked items in the requested order under one heading', () => {
    const text = formatSoapSessionInformation({
        client: 'Jane Doe',
        additionalParticipants: 'None',
        dateOfService: 'November 10, 2026',
        psychotherapyStartTime: '10:00 AM',
        psychotherapyEndTime: '10:53 AM',
        actualPsychotherapyMinutes: '53 minutes',
        modality: 'Telehealth',
        clientPhysicalLocation: 'Home: 12 Main St',
        serviceTypeCpt: '90837'
    });

    assert.equal(text, [
        'Session Information:',
        'Client: Jane Doe',
        'Additional Participants: None',
        'Date of Service: November 10, 2026',
        'Start Time: 10:00 AM',
        'End Time: 10:53 AM',
        'Actual Time of Psychotherapy: 53 minutes',
        'Modality: Telehealth',
        "Client's Physical Location: Home: 12 Main St",
        'Service Type / CPT Code: 90837'
    ].join('\n'));
});

test('unchecked fields are omitted while checked fields with no value remain omitted', () => {
    const inclusion = normalizeSoapSessionInformationInclusion({
        client: false,
        dateOfService: true,
        psychotherapyStartTime: true,
        psychotherapyEndTime: false
    });
    const text = formatSoapSessionInformation({
        client: 'Jane Doe',
        dateOfService: 'November 10, 2026',
        psychotherapyStartTime: '10:00 AM',
        psychotherapyEndTime: '10:53 AM'
    }, inclusion);

    assert.equal(text, 'Session Information:\nDate of Service: November 10, 2026\nStart Time: 10:00 AM');
});

test('empty selections produce no Session Information block', () => {
    const inclusion = Object.fromEntries(SOAP_SESSION_INFORMATION_FIELDS.map(field => [field.key, false]));
    assert.equal(formatSoapSessionInformation({ client: 'Jane Doe' }, inclusion), '');
});

test('collapse readiness requires every included field and ignores unchecked fields', () => {
    const noFieldsIncluded = Object.fromEntries(SOAP_SESSION_INFORMATION_FIELDS.map(field => [field.key, false]));
    assert.equal(areSoapSessionInformationValuesComplete({ client: 'Jane Doe', dateOfService: '11/10/2026' }, {
        ...noFieldsIncluded,
        client: true,
        dateOfService: true,
        actualPsychotherapyMinutes: false
    }), true);
    assert.equal(areSoapSessionInformationValuesComplete({ client: 'Jane Doe' }, {
        ...noFieldsIncluded,
        client: true,
        dateOfService: true
    }), false);
    assert.equal(areSoapSessionInformationValuesComplete({ client: 'Jane Doe' }, {
        ...noFieldsIncluded,
        client: false
    }), false);
});

test('physical location options come from Home and other saved Client Information locations', () => {
    const client = {
        homeAddress: '12 Main St',
        otherTherapyLocations: [{ id: 'work', label: 'Work', address: '400 Office Ave' }],
        physicalLocation: 'Legacy instructions value'
    };
    assert.deepEqual(getClientPhysicalLocations(client), [
        { id: 'home', label: 'Home', address: '12 Main St' },
        { id: 'work', label: 'Work', address: '400 Office Ave' }
    ]);
    assert.deepEqual(resolveSoapPhysicalLocation(client, {}), {
        id: 'home', label: 'Home', address: '12 Main St', text: 'Home: 12 Main St'
    });
    assert.equal(resolveSoapPhysicalLocation(client, { clientPhysicalLocationId: 'work' }).text, 'Work: 400 Office Ave');
});

test('manual travel location overrides saved locations with name and address', () => {
    const selected = resolveSoapPhysicalLocation({ homeAddress: '12 Main St' }, {
        clientPhysicalLocationId: 'custom',
        clientPhysicalLocationName: 'Travel',
        clientPhysicalLocationAddress: '88 Lake Road'
    });
    assert.deepEqual(selected, {
        id: 'custom', label: 'Travel', address: '88 Lake Road', text: 'Travel: 88 Lake Road'
    });
});

test('legacy Instructions location is not consulted unless already snapshotted on the appointment', () => {
    assert.equal(resolveSoapPhysicalLocation({ physicalLocation: 'Albany, NY' }, {}).text, '');
    assert.equal(resolveSoapPhysicalLocation({ physicalLocation: 'Albany, NY' }, {
        clientPhysicalLocationSnapshot: 'Albany, NY'
    }).text, 'Previous Location: Albany, NY');
});

for (const path of ['../index.html', '../src/index.html']) {
    test(`${path} configures Session Information fields in EHR Configuration and keeps the SOAP section compact`, async () => {
        const html = await readFile(new URL(path, import.meta.url), 'utf8');

        assert.match(html, /data-soap-section-key="sessionInformation"/);
        assert.match(html, /Session Information:/);
        assert.match(html, /id="soapPlatformSessionInformationList"/);
        assert.match(html, /SOAP_SESSION_INFORMATION_FIELDS\.forEach\(field =>/);
        assert.match(html, /sessionInfoConfigField/);
        assert.doesNotMatch(html, /renderSessionInformationIncludeCheckbox/);
        assert.doesNotMatch(html, /soap-session-info-checkbox/);

        const sectionStart = html.indexOf('<div class="soap-support-block" data-soap-section-key="sessionInformation">');
        const sectionEnd = html.indexOf('<div class="soap-support-block" data-soap-section-key="diagnosisStatus">', sectionStart);
        const sessionSection = html.slice(sectionStart, sectionEnd);
        assert.equal((sessionSection.match(/renderSoapCopyButton\(/g) || []).length, 1);
        assert.doesNotMatch(sessionSection, /renderSessionInformationIncludeCheckbox|soap-session-info-checkbox/);
        assert.match(sessionSection, /Add'l Ptcpt/);
        assert.match(sessionSection, /Ct's Location:/);
        assert.match(sessionSection, />CPT</);
        assert.equal((sessionSection.match(/soap-session-info-item--inline/g) || []).length, 6);
        assert.doesNotMatch(sessionSection, /Additional Participants \/ Interruptions/);
        assert.match(sessionSection, /soap-session-time-summary/);
        assert.match(html, /\.soap-session-time-grid\s*\{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
        assert.match(html, /#soapContent\s*\{[^}]*gap:\s*12px/);
        assert.match(html, /#soapContent\s*> \.soap-section,[\s\S]*?#soapContent\s*> \.soap-support-block\s*\{\s*margin:\s*0/);
        assert.match(html, /\.soap-header,\s*\.soap-support-header\s*\{[^}]*font-size:\s*0\.95rem[^}]*font-weight:\s*700/);
        assert.match(html, /grid-template-columns: minmax\(104px, 32%\) minmax\(0, 1fr\)/);
        assert.match(sessionSection, /id="toggleSoapSessionInformationBtn"/);
        assert.match(sessionSection, /sessionInformationCollapsed/);
        assert.match(html, /data-session-field="clientPhysicalLocationId"/);
        assert.match(html, /Travel \/ Other \(manual override\)/);
        assert.doesNotMatch(html, /id="clientPhysicalLocationInput"/);
        assert.match(html, /physicalLocation: "the client's physical location"/);
        assert.match(html, /resolveSoapPhysicalLocation\(client, sessionFields\)\.text/);
        assert.doesNotMatch(html, /client\.physicalLocation = physicalLocation/);
    });
}
