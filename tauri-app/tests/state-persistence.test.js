import test from 'node:test';
import assert from 'node:assert/strict';

import {
    LEGACY_STATE_KEY,
    loadEncryptedStateWithLegacyMigration,
    saveEncryptedState
} from '../src/state-persistence.js';

const createStorage = (initialValue = null) => {
    let value = initialValue;
    let removeCount = 0;

    return {
        getItem(key) {
            assert.equal(key, LEGACY_STATE_KEY);
            return value;
        },
        removeItem(key) {
            assert.equal(key, LEGACY_STATE_KEY);
            value = null;
            removeCount += 1;
        },
        setItem() {
            throw new Error('Chart data must never be written to browser storage.');
        },
        get value() {
            return value;
        },
        get removeCount() {
            return removeCount;
        }
    };
};

test('saves chart state only to the encrypted database and removes a legacy copy', async () => {
    const storage = createStorage('{"stale":true}');
    const state = { data: { clients: [] } };
    let savedState = null;

    const saved = await saveEncryptedState({
        state,
        databaseReady: true,
        saveDatabaseState: async (nextState) => {
            savedState = nextState;
            return true;
        },
        legacyStorage: storage
    });

    assert.equal(saved, true);
    assert.equal(savedState, state);
    assert.equal(storage.value, null);
    assert.equal(storage.removeCount, 1);
});

test('does not fall back to browser storage while the encrypted database is locked', async () => {
    const storage = createStorage('{"preserve":true}');
    let databaseSaveCalled = false;

    const saved = await saveEncryptedState({
        state: { data: {} },
        databaseReady: false,
        saveDatabaseState: async () => {
            databaseSaveCalled = true;
            return true;
        },
        legacyStorage: storage
    });

    assert.equal(saved, false);
    assert.equal(databaseSaveCalled, false);
    assert.equal(storage.value, '{"preserve":true}');
});

test('loads the encrypted database state and clears a stale browser copy', async () => {
    const storage = createStorage('{"stale":true}');
    const databaseState = { data: { clients: [{ id: 'client-1' }] } };

    const state = await loadEncryptedStateWithLegacyMigration({
        databaseReady: true,
        loadDatabaseState: async () => databaseState,
        saveDatabaseState: async () => {
            throw new Error('The authoritative database state must not be replaced.');
        },
        legacyStorage: storage
    });

    assert.equal(state, databaseState);
    assert.equal(storage.value, null);
});

test('migrates legacy browser state before deleting the legacy copy', async () => {
    const legacyState = { data: { clients: [{ id: 'legacy-client' }] } };
    const storage = createStorage(JSON.stringify(legacyState));
    let storageValueDuringSave = null;

    const state = await loadEncryptedStateWithLegacyMigration({
        databaseReady: true,
        loadDatabaseState: async () => null,
        saveDatabaseState: async (nextState) => {
            storageValueDuringSave = storage.value;
            assert.deepEqual(nextState, legacyState);
            return true;
        },
        legacyStorage: storage
    });

    assert.deepEqual(state, legacyState);
    assert.equal(storageValueDuringSave, JSON.stringify(legacyState));
    assert.equal(storage.value, null);
});

test('retains legacy browser state when database migration fails', async () => {
    const legacyText = '{"data":{"clients":[]}}';
    const storage = createStorage(legacyText);

    await assert.rejects(
        loadEncryptedStateWithLegacyMigration({
            databaseReady: true,
            loadDatabaseState: async () => null,
            saveDatabaseState: async () => false,
            legacyStorage: storage
        }),
        /could not be migrated/
    );

    assert.equal(storage.value, legacyText);
    assert.equal(storage.removeCount, 0);
});
