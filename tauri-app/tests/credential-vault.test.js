import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCredentialVault, credentialStorage, writeCredential } from '../src/credential-vault.js';

test('legacy provider credentials are removed only after OS vault persistence succeeds', async () => {
    const plaintext = new Map([['apiKey','legacy-api'],['openaiApiKey','legacy-openai']]);
    const secure = new Map();
    const storage = {getItem:key=>plaintext.get(key)||null, removeItem:key=>plaintext.delete(key), setItem:()=>assert.fail('Never write plaintext credentials')};
    let locked = true;
    const invoke = async (command,{key,secret}) => {
        if (command === 'read_app_secret') return secure.get(key)||null;
        if (locked) throw new Error('Keychain unavailable');
        if (command === 'store_app_secret') secure.set(key,secret);
        if (command === 'remove_app_secret') secure.delete(key);
    };
    await loadCredentialVault(invoke,storage);
    assert.equal(plaintext.size,2); assert.equal(secure.size,0);
    locked = false; await loadCredentialVault(invoke,storage);
    assert.equal(plaintext.size,0); assert.equal(secure.get('apiKey'),'legacy-api');
    await writeCredential('apiKey','new-api'); assert.equal(credentialStorage.getItem('apiKey'),'new-api');
    locked = true; credentialStorage.setItem('openaiApiKey','session-only');
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(credentialStorage.getItem('openaiApiKey'),'session-only');
    assert.equal(secure.get('openaiApiKey'),'legacy-openai');
    assert.equal(plaintext.size,0);
    credentialStorage.removeItem('apiKey'); await new Promise(resolve=>setImmediate(resolve));
});
