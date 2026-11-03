const values = new Map();
let invokeNative;
let persistence = Promise.resolve();
export const PROVIDER_SECRET_KEYS = ['apiKey', 'openaiApiKey', 'vertexServiceAccount'];

export async function loadCredentialVault(invoke, legacyStorage) {
    invokeNative = invoke;
    for (const key of PROVIDER_SECRET_KEYS) {
        try {
            const saved = await invoke('read_app_secret', { key });
            const legacy = legacyStorage?.getItem(key);
            if (saved) values.set(key, saved);
            else if (legacy) { await invoke('store_app_secret', { key, secret: legacy }); values.set(key, legacy); }
            if (saved || legacy) legacyStorage?.removeItem(key);
        } catch {
            // An unavailable OS vault never causes plaintext persistence. Legacy values
            // remain untouched until they can be migrated successfully.
        }
    }
}

export async function writeCredential(key, secret) {
    if (!invokeNative) throw new Error('OS credential storage is unavailable.');
    await invokeNative('store_app_secret', { key, secret });
    values.set(key, secret);
}
export async function readCredential(key) {
    if (values.has(key)) return values.get(key);
    if (!invokeNative) return '';
    const secret = await invokeNative('read_app_secret', { key });
    if (secret) values.set(key, secret);
    return secret || '';
}
export const credentialStorage = {
    getItem: key => values.get(key) || null,
    setItem(key, value) {
        values.set(key, String(value));
        persistence = persistence.catch(() => {}).then(() => {
            if (!invokeNative) throw new Error('OS credential storage is unavailable.');
            return invokeNative('store_app_secret', { key, secret: String(value) });
        }).catch(() => {
            globalThis.dispatchEvent?.(new Event('credential-storage-unavailable'));
        });
    },
    removeItem(key) {
        values.delete(key);
        persistence = persistence.catch(() => {}).then(() => invokeNative?.('remove_app_secret', { key })).catch(() => {
            globalThis.dispatchEvent?.(new Event('credential-storage-unavailable'));
        });
    }
};
