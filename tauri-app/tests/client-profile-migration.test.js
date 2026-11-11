import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateClientProfileFields } from '../src/client-profile-migration.js';

test('splits a legacy full name at the first space and retains its original value', () => {
    const client = { name: 'Jane Mary Doe' };
    assert.equal(migrateClientProfileFields(client), true);
    assert.equal(client.firstName, 'Jane');
    assert.equal(client.lastName, 'Mary Doe');
    assert.equal(client.legacyName, 'Jane Mary Doe');
    assert.equal(client.name, 'Jane Mary Doe');
});

test('copies first legacy phone and email without changing old contact entries', () => {
    const contactInfo = {
        phones: [{ value: '5555551212', locked: true }, { value: '5555553434' }],
        emails: [{ value: 'jane@example.com', locked: true }]
    };
    const client = { name: 'Jane Doe', contactInfo };
    assert.equal(migrateClientProfileFields(client), true);
    assert.equal(client.phoneNumber, '5555551212');
    assert.equal(client.email, 'jane@example.com');
    assert.equal(client.contactInfo, contactInfo);
    assert.equal(client.contactInfo.phones.length, 2);
});

test('copies legacy pronouns and preserves existing profile values', () => {
    const pronouns = { value: 'she/hers', subject: 'she', object: 'her', possessive: 'hers' };
    const client = { name: 'Jane Doe', preferredPronouns: pronouns, firstName: 'Janet', phoneNumber: 'old-format' };
    assert.equal(migrateClientProfileFields(client), true);
    assert.equal(client.firstName, 'Janet');
    assert.equal(client.lastName, 'Doe');
    assert.equal(client.phoneNumber, 'old-format');
    assert.deepEqual(client.pronouns, pronouns);
    assert.equal(client.preferredPronouns, pronouns);
});

test('imports legacy free-text pronouns without discarding the source value', () => {
    const client = { name: 'Alex Smith', instructions: { preferredPronouns: 'ze/zir/zirs' } };
    assert.equal(migrateClientProfileFields(client), true);
    assert.deepEqual(client.pronouns, {
        value: 'ze/zir/zirs', subject: '', object: '', possessive: ''
    });
    assert.equal(client.instructions.preferredPronouns, 'ze/zir/zirs');
});

test('copies legacy DOB, address, and therapy locations without deleting their sources', () => {
    const legacyLocations = [{ label: 'Work', address: 'Office' }];
    const client = { name: 'Jane Doe', dob: '1990-05-07', address: '10 Main St', otherLocations: legacyLocations };
    assert.equal(migrateClientProfileFields(client), true);
    assert.equal(client.dateOfBirth, '1990-05-07');
    assert.equal(client.homeAddress, '10 Main St');
    assert.deepEqual(client.otherTherapyLocations, [{ id: 'legacy-0', label: 'Work', address: 'Office' }]);
    assert.equal(client.dob, '1990-05-07');
    assert.equal(client.address, '10 Main St');
    assert.equal(client.otherLocations, legacyLocations);
});

test('moves a previously saved Instructions location into Client Information without deleting the source', () => {
    const client = {
        clientInformationVersion: 1,
        name: 'Jane Doe',
        physicalLocation: '12 Main Street, Albany, NY',
        otherTherapyLocations: []
    };
    assert.equal(migrateClientProfileFields(client), true);
    assert.deepEqual(client.otherTherapyLocations, [{
        id: 'legacy-physical-location',
        label: 'Previously Saved Location',
        address: '12 Main Street, Albany, NY'
    }]);
    assert.equal(client.physicalLocation, '12 Main Street, Albany, NY');
    assert.equal(migrateClientProfileFields(client), false);
});

test('does not duplicate a previously saved location already in Client Information', () => {
    const client = {
        clientInformationVersion: 1,
        name: 'Jane Doe',
        physicalLocation: '12 Main Street, Albany, NY',
        otherTherapyLocations: [{ id: 'work', label: 'Work', address: '12 Main Street, Albany, NY' }]
    };
    migrateClientProfileFields(client);
    assert.equal(client.otherTherapyLocations.length, 1);
    assert.equal(client.physicalLocation, '12 Main Street, Albany, NY');
});

test('migration is idempotent and handles a mononym', () => {
    const mononym = { name: 'Cher' };
    assert.equal(migrateClientProfileFields(mononym), true);
    assert.equal(mononym.firstName, 'Cher');
    assert.equal(mononym.lastName, undefined);
    assert.equal(migrateClientProfileFields(mononym), false);
});

test('leaves malformed or empty legacy contact data intact', () => {
    const client = { name: '', contactInfo: { phones: [], emails: [] }, phoneNumber: '' };
    assert.equal(migrateClientProfileFields(client), true);
    assert.deepEqual(client.contactInfo, { phones: [], emails: [] });
    assert.equal(client.clientInformationVersion, 1);
});

test('does not re-import cleared profile values after initial migration', () => {
    const client = {
        name: 'Jane Doe',
        contactInfo: { phones: [{ value: '555-555-1212' }], emails: [{ value: 'jane@example.com' }] },
        dob: '1990-05-07',
        address: '10 Main St'
    };
    migrateClientProfileFields(client);
    client.firstName = '';
    client.phoneNumber = '';
    client.email = '';
    client.dateOfBirth = '';
    client.homeAddress = '';
    assert.equal(migrateClientProfileFields(client), false);
    assert.equal(client.firstName, '');
    assert.equal(client.phoneNumber, '');
    assert.equal(client.email, '');
    assert.equal(client.dateOfBirth, '');
    assert.equal(client.homeAddress, '');
    assert.equal(client.contactInfo.phones[0].value, '555-555-1212');
});
