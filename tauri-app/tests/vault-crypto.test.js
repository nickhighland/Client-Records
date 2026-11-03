import test from 'node:test';
import assert from 'node:assert/strict';
import CryptoJS from 'crypto-js';
import { createVaultCredentials, unlockVaultRecord, changeVaultPassword, recoverVaultRecord, encryptVaultState, decryptVaultState } from '../src/vault-crypto.js';
import { legacyStateFromSql, unlockLegacyBackup } from '../src/legacy-backup.js';

const original = { data: { clients: [{ name: 'Synthetic test only', appointments: [{ soap: { o: 'Writer explored Ct’s concerns. 📝', diagnosticSupport: 'F41.1: Session content.' } }] }] }, deletedItems: { notes: [{ text: 'Preserve deleted notes too.' }] } };

test('password changes and recovery preserve every note without changing the data key', async () => {
    const credentials = await createVaultCredentials('original password');
    const encrypted = await encryptVaultState(original, credentials.dataKey);
    assert.equal(await unlockVaultRecord(credentials.record, 'original password'), credentials.dataKey);
    await assert.rejects(unlockVaultRecord(credentials.record, 'wrong password'));
    const changed = await changeVaultPassword(credentials.record, 'original password', 'changed password');
    assert.equal(changed.dataKey, credentials.dataKey);
    await assert.rejects(unlockVaultRecord(changed.record, 'original password'));
    assert.deepEqual(await decryptVaultState(encrypted, await unlockVaultRecord(changed.record, 'changed password')), original);
    const recovered = await recoverVaultRecord(changed.record, credentials.recoveryCode, 'recovered password');
    assert.equal(recovered.dataKey, credentials.dataKey);
    assert.deepEqual(await decryptVaultState(encrypted, await unlockVaultRecord(recovered.record, 'recovered password')), original);
    await assert.rejects(recoverVaultRecord(recovered.record, 'RK-incorrect', 'another password'));
    assert.deepEqual(await decryptVaultState(encrypted, recovered.dataKey), original);
    const rotated = await createVaultCredentials('recovered password', recovered.dataKey);
    await assert.rejects(recoverVaultRecord(rotated.record, credentials.recoveryCode, 'another password'));
    assert.deepEqual(await decryptVaultState(encrypted, rotated.dataKey), original);
});

test('authenticated encryption detects corruption, wrong keys, and envelope substitution', async () => {
    const credentials = await createVaultCredentials('test password');
    const encrypted = await encryptVaultState(original, credentials.dataKey);
    const damaged = JSON.parse(encrypted);
    damaged.data = (damaged.data[0] === 'A' ? 'B' : 'A') + damaged.data.slice(1);
    await assert.rejects(decryptVaultState(JSON.stringify(damaged), credentials.dataKey));
    await assert.rejects(decryptVaultState(encrypted, 'ab'.repeat(32)));
    const record = JSON.parse(credentials.record);
    record.password = { ...record.recovery };
    await assert.rejects(unlockVaultRecord(JSON.stringify(record), credentials.recoveryCode));
    assert.deepEqual(await decryptVaultState(encrypted, credentials.dataKey), original);
});

test('large existing workspaces round-trip without argument-size limits', async () => {
    const state = structuredClone(original);
    state.data.clients[0].appointments[0].soap.o = 'Ct’s saved note. 📝\n'.repeat(100000);
    const key = 'bc'.repeat(32);
    const encrypted = await encryptVaultState(state, key);
    assert.deepEqual(await decryptVaultState(encrypted, key), state);
});

test('legacy backups import the actual old SQL export without executing it or changing source bytes', () => {
    const key = CryptoJS.SHA256('original passwordold-user').toString();
    const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(original), key).toString();
    const sql = `-- SmartEMR SQL Export\nCREATE TABLE app_state (key TEXT PRIMARY KEY, value TEXT);\nINSERT INTO app_state (key, value) VALUES ('main_state', '${ciphertext}');\nDROP TABLE users;\n`;
    assert.equal(legacyStateFromSql(sql), ciphertext);
    const payload = { format: 'client-records-sql-export', data: CryptoJS.AES.encrypt(sql, key).toString() };
    const source = JSON.stringify(payload);
    assert.deepEqual(unlockLegacyBackup(payload, 'old-user', 'original password'), original);
    assert.throws(() => unlockLegacyBackup(payload, 'old-user', 'wrong password'));
    assert.equal(JSON.stringify(payload), source);
    assert.deepEqual(unlockLegacyBackup(sql, 'old-user', 'original password'), original);
});
