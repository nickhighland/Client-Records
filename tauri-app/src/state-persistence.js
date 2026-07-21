export const LEGACY_STATE_KEY = 'clientData';

const hasState = (state) => state !== null && state !== undefined;

const removeLegacyState = (legacyStorage) => {
    if (legacyStorage?.getItem(LEGACY_STATE_KEY) !== null) {
        legacyStorage.removeItem(LEGACY_STATE_KEY);
    }
};

export async function saveEncryptedState({
    state,
    databaseReady,
    saveDatabaseState,
    legacyStorage
}) {
    if (!databaseReady) {
        return false;
    }

    const saved = await saveDatabaseState(state);
    if (!saved) {
        throw new Error('Encrypted database save failed.');
    }

    removeLegacyState(legacyStorage);
    return true;
}

export async function loadEncryptedStateWithLegacyMigration({
    databaseReady,
    loadDatabaseState,
    saveDatabaseState,
    legacyStorage
}) {
    if (!databaseReady) {
        return null;
    }

    const databaseState = await loadDatabaseState();
    const legacyStateText = legacyStorage?.getItem(LEGACY_STATE_KEY);

    if (hasState(databaseState)) {
        removeLegacyState(legacyStorage);
        return databaseState;
    }

    if (!legacyStateText) {
        return null;
    }

    const legacyState = JSON.parse(legacyStateText);
    if (!legacyState || typeof legacyState !== 'object' || Array.isArray(legacyState)) {
        throw new Error('Legacy chart data is not a valid application state.');
    }

    const migrated = await saveDatabaseState(legacyState);
    if (!migrated) {
        throw new Error('Legacy chart data could not be migrated to the encrypted database.');
    }

    removeLegacyState(legacyStorage);
    return legacyState;
}
