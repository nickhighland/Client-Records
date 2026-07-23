import { getVertexApiHost } from './vertex-models.js';

export const VERTEX_CONTEXT_CACHE_TTL_SECONDS = 15 * 60 * 60;

const CACHE_STORAGE_PREFIX = 'smartemr.vertex-soap-cache.v1';
const CACHE_EXPIRY_SAFETY_MS = 2 * 60 * 1000;
const eligibilityMemo = new Map();

const normalizeModelId = (modelId) => String(modelId || '').trim().toLowerCase();

const isImplicitOnlyModel = (modelId) => {
    const normalized = normalizeModelId(modelId);
    return normalized.includes('gemini-3.1-pro')
        || normalized.includes('gemini-3-pro-preview')
        || normalized.includes('gemini-3.0-flash-preview');
};

export const getVertexContextCacheMinimumTokens = (modelId) => {
    const normalized = normalizeModelId(modelId);
    if (normalized.startsWith('gemini-3')) return 4096;
    if (normalized.startsWith('gemini-2')) return 2048;
    return Number.POSITIVE_INFINITY;
};

const hashText = (value) => {
    let hash = 2166136261;
    const text = String(value || '');
    for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
};

export const buildVertexSoapCacheMaterial = ({
    systemPrompt,
    interventionBankContext
}) => ({
    systemInstruction: {
        parts: [{ text: String(systemPrompt || '') }]
    },
    contents: [{
        role: 'user',
        parts: [{
            text: `**Reusable Intervention Reference:**${String(interventionBankContext || '\nNo intervention bank entries are configured.')}`
        }]
    }]
});

export const buildVertexCachedSoapPayload = ({ cacheName, userPrompt }) => ({
    cachedContent: cacheName,
    contents: [{
        role: 'user',
        parts: [{ text: `**User Input:**\n${String(userPrompt || '')}` }]
    }],
    generationConfig: {
        responseMimeType: 'application/json'
    }
});

export const buildVertexDirectSoapPayload = ({
    systemPrompt,
    interventionBankContext,
    userPrompt
}) => ({
    systemInstruction: {
        parts: [{ text: String(systemPrompt || '') }]
    },
    contents: [{
        role: 'user',
        parts: [{
            text: `**Reusable Intervention Reference:**${String(interventionBankContext || '\nNo intervention bank entries are configured.')}\n\n**User Input:**\n${String(userPrompt || '')}`
        }]
    }],
    generationConfig: {
        responseMimeType: 'application/json'
    }
});

const parseResponseError = async (response) => {
    const responseText = await response.text();
    try {
        return JSON.parse(responseText)?.error?.message || responseText;
    } catch (_) {
        return responseText;
    }
};

const getCacheIdentity = ({ projectId, location, modelId, cacheMaterial }) => {
    const fingerprint = hashText(JSON.stringify(cacheMaterial));
    return {
        fingerprint,
        storageKey: [
            CACHE_STORAGE_PREFIX,
            projectId,
            String(location || '').toLowerCase(),
            modelId,
            fingerprint
        ].join(':')
    };
};

const readStoredCache = ({ storage, storageKey, now }) => {
    if (!storage) return null;
    try {
        const stored = JSON.parse(storage.getItem(storageKey));
        const expiresAt = Date.parse(stored?.expireTime || '');
        if (!stored?.name || !Number.isFinite(expiresAt) || expiresAt - now <= CACHE_EXPIRY_SAFETY_MS) {
            storage.removeItem(storageKey);
            return null;
        }
        return stored;
    } catch (_) {
        storage.removeItem(storageKey);
        return null;
    }
};

export const invalidateVertexContextCache = ({ storage, storageKey }) => {
    if (storage && storageKey) {
        storage.removeItem(storageKey);
    }
};

export const getOrCreateVertexSoapContextCache = async ({
    accessToken,
    cacheMaterial,
    fetchImpl,
    location,
    modelId,
    now = Date.now(),
    projectId,
    storage
}) => {
    if (isImplicitOnlyModel(modelId)) {
        return { cacheName: '', reason: 'implicit-only', storageKey: '' };
    }

    const minimumTokens = getVertexContextCacheMinimumTokens(modelId);
    if (!Number.isFinite(minimumTokens)) {
        return { cacheName: '', reason: 'unsupported-model', storageKey: '' };
    }

    const identity = getCacheIdentity({
        projectId,
        location,
        modelId,
        cacheMaterial
    });
    const stored = readStoredCache({
        storage,
        storageKey: identity.storageKey,
        now
    });
    if (stored) {
        return {
            cacheName: stored.name,
            reason: 'reused',
            storageKey: identity.storageKey
        };
    }

    const memoizedEligibility = eligibilityMemo.get(identity.storageKey);
    let totalTokens = memoizedEligibility?.totalTokens;
    const host = getVertexApiHost(location);
    const modelResource = `projects/${projectId}/locations/${location}/publishers/google/models/${modelId}`;

    if (!Number.isFinite(totalTokens)) {
        const countUrl = `https://${host}/v1/${modelResource}:countTokens`;
        const countResponse = await fetchImpl(countUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(cacheMaterial)
        });
        if (!countResponse.ok) {
            const details = await parseResponseError(countResponse);
            throw new Error(`Vertex cache token count failed (${countResponse.status}): ${details}`);
        }

        const countResult = await countResponse.json();
        totalTokens = Number(countResult?.totalTokens);
        if (!Number.isFinite(totalTokens)) {
            throw new Error('Vertex returned an invalid token count for the SOAP context cache.');
        }
        eligibilityMemo.set(identity.storageKey, { totalTokens });
    }

    if (totalTokens < minimumTokens) {
        return {
            cacheName: '',
            reason: 'below-minimum',
            storageKey: identity.storageKey,
            totalTokens
        };
    }

    const cacheUrl = `https://${host}/v1/projects/${projectId}/locations/${location}/cachedContents`;
    const cacheResponse = await fetchImpl(cacheUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            model: modelResource,
            displayName: `SmartEMR SOAP ${identity.fingerprint}`,
            ...cacheMaterial,
            ttl: `${VERTEX_CONTEXT_CACHE_TTL_SECONDS}s`
        })
    });
    if (!cacheResponse.ok) {
        const details = await parseResponseError(cacheResponse);
        throw new Error(`Vertex context cache creation failed (${cacheResponse.status}): ${details}`);
    }

    const cacheResult = await cacheResponse.json();
    if (!cacheResult?.name || !cacheResult?.expireTime) {
        throw new Error('Vertex returned an invalid SOAP context cache response.');
    }

    const storedCache = {
        name: cacheResult.name,
        expireTime: cacheResult.expireTime
    };
    storage?.setItem(identity.storageKey, JSON.stringify(storedCache));

    return {
        cacheName: storedCache.name,
        reason: 'created',
        storageKey: identity.storageKey,
        totalTokens
    };
};
