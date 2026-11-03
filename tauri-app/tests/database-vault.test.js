import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import CryptoJS from 'crypto-js';

// Use the real persistence/authentication module with an isolated SQL adapter.
// No test opens a desktop database or reads any user workspace.
let user = null, ciphertext = null, failSave = false, failMigration = false;
let legacyRecovery, portableBackup;
const database = {
    async select(sql, params = []) {
        if (sql.startsWith('PRAGMA')) return ['email','smtp_host','smtp_port','smtp_security','smtp_username','smtp_from','smtp_password','recovery_enabled','email_verified','email_verified_at'].map(name => ({name}));
        if (sql.includes('FROM users')) return user && (!params.length || params[0] === user.username) ? [{...user}] : [];
        if (sql.includes('FROM app_state')) return ciphertext ? [{value:ciphertext}] : [];
        return [];
    },
    async execute(sql, params = []) {
        if (sql.startsWith('INSERT INTO users')) user = {username:params[0],password_hash:params[1],email_verified:1};
        if (sql.startsWith('UPDATE users SET password_hash')) user.password_hash = params[0];
        if (sql.startsWith('INSERT INTO app_state')) { if (failSave) throw new Error('simulated disk full'); ciphertext = params[1]; }
    }
};
globalThis.__labTestDatabase = database;
globalThis.window = { __TAURI__: { core: { invoke: async (command, {args}) => {
    assert.equal(command,'migrate_legacy_vault');
    assert.equal(args.oldVerifier,user.password_hash); assert.equal(args.oldState,ciphertext);
    if (failMigration) throw new Error('simulated transaction failure');
    user.password_hash = args.newVerifier; ciphertext = args.newState;
} } } };
const file = new URL('../src/database.js',import.meta.url);
let source = await readFile(file,'utf8');
source = source.replace("import Database from '@tauri-apps/plugin-sql';",'const Database = {load:async()=>globalThis.__labTestDatabase};')
    .replace(/from '(\.\/[^']+)'/g, (_match,path) => `from '${new URL(path,file).href}'`)
    .replace("from 'crypto-js'",`from '${import.meta.resolve('crypto-js')}'`);
const vault = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const state = {data:{clients:[{name:'Synthetic only',appointments:[{soap:{o:'Writer explored Ct’s concerns.',s:'Keep this exact text.'}}]}]},deletedItems:{notes:[]}};

test('real database functions retain current notes through password change, recovery, failed saves and locking', async () => {
    assert.equal(await vault.createUser('lab-test','original password'),true);
    const kit = vault.takeRecoveryKit();
    assert.equal(await vault.loginUser('lab-test','original password'),true);
    assert.equal(await vault.saveState(state),true);
    const originalCiphertext = ciphertext;
    assert.equal(await vault.changePassword('original password','new password'),true);
    assert.equal(ciphertext,originalCiphertext,'password change must not rewrite notes');
    vault.clearActiveSession();
    assert.equal(await vault.loginUser('lab-test','original password'),false);
    assert.equal(await vault.loginUser('lab-test','new password'),true);
    assert.deepEqual(await vault.loadState(),state);
    const verifier = user.password_hash;
    assert.equal(await vault.confirmPasswordReset('lab-test','RK-wrong','reset password'),false);
    assert.equal(user.password_hash,verifier); assert.equal(ciphertext,originalCiphertext);
    assert.equal(await vault.confirmPasswordReset('lab-test',kit.recoveryCode,'reset password'),true);
    vault.clearActiveSession();
    assert.equal(await vault.loginUser('lab-test','reset password'),true);
    assert.deepEqual(await vault.loadState(),state);
    const edited = structuredClone(state); edited.data.clients[0].appointments[0].soap.o = 'New unsaved edit';
    failSave = true;
    assert.equal(await vault.saveState(edited),false); assert.equal(ciphertext,originalCiphertext);
    await vault.preserveUnsavedDraft(edited); vault.clearActiveSession();
    assert.equal(vault.hasPendingVolatileDraft(),true);
    assert.equal(await vault.loginUser('lab-test','reset password'),true);
    assert.deepEqual(await vault.loadState(),edited);
    failSave = false; assert.equal(await vault.saveState(edited),true);
    assert.equal(vault.hasPendingVolatileDraft(),false);
    vault.clearActiveSession(); assert.equal(await vault.loginUser('lab-test','reset password'),true);
    assert.deepEqual(await vault.loadState(),edited);
});

test('legacy migration failure retains original encrypted notes and credentials, and retry preserves exact notes', async () => {
    vault.clearActiveSession();
    const password = 'legacy password';
    user = {username:'legacy-test',password_hash:CryptoJS.SHA256(password).toString(),email_verified:1};
    ciphertext = CryptoJS.AES.encrypt(JSON.stringify(state),CryptoJS.SHA256(password+'legacy-test').toString()).toString();
    const originalCiphertext = ciphertext, originalVerifier = user.password_hash;
    failMigration = true;
    assert.equal(await vault.loginUser('legacy-test',password),false);
    assert.equal(ciphertext,originalCiphertext); assert.equal(user.password_hash,originalVerifier);
    failMigration = false;
    assert.equal(await vault.loginUser('legacy-test',password),true);
    assert.deepEqual(await vault.loadState(),state);
    const migratedCiphertext = ciphertext;
    legacyRecovery = vault.takeRecoveryKit().recoveryCode;
    assert.equal(await vault.confirmPasswordReset('legacy-test',legacyRecovery,'recovered password'),true);
    vault.clearActiveSession(); assert.equal(await vault.loginUser('legacy-test','recovered password'),true);
    assert.deepEqual(await vault.loadState(),state); assert.equal(ciphertext,migratedCiphertext);
    portableBackup = await vault.exportEncryptedSqlDump();
});

test('portable backups restore with a recovery key into a different Lab vault without altering source bytes', async () => {
    const originalSource = JSON.stringify(portableBackup);
    vault.clearActiveSession(); user = null; ciphertext = null;
    assert.equal(await vault.createUser('different-lab','different password'),true);
    assert.equal(await vault.loginUser('different-lab','different password'),true);
    const previous = {data:{clients:[]},deletedItems:{notes:[]}};
    assert.equal(await vault.saveState(previous),true);
    const previousCiphertext = ciphertext;
    await assert.rejects(vault.importEncryptedSqlDump(portableBackup,'','wrong password'));
    assert.equal(ciphertext,previousCiphertext);
    failSave = true;
    await assert.rejects(vault.importEncryptedSqlDump(portableBackup,'',legacyRecovery));
    assert.equal(ciphertext,previousCiphertext); assert.deepEqual(await vault.loadState(),previous);
    failSave = false;
    await vault.importEncryptedSqlDump(portableBackup,'',legacyRecovery);
    assert.deepEqual(await vault.loadState(),state);
    assert.equal(JSON.stringify(portableBackup),originalSource);
    vault.clearActiveSession(); assert.equal(await vault.loginUser('different-lab','different password'),true);
    assert.deepEqual(await vault.loadState(),state);
});
