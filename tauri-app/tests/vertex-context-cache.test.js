import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildVertexCachedSoapPayload,
    buildVertexDirectSoapPayload,
    buildVertexSoapCacheMaterial,
    getOrCreateVertexSoapContextCache,
    getVertexContextCacheMinimumTokens,
    invalidateVertexContextCache
} from '../src/vertex-context-cache.js';

const createStorage = () => {
    const values = new Map();
    return {
        getItem: key => values.get(key) ?? null,
        removeItem: key => values.delete(key),
        setItem: (key, value) => values.set(key, value)
    };
};

const makeJsonResponse = (body, ok = true, status = 200) => ({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body)
});

test('keeps reusable instructions separate from client-specific SOAP input', () => {
    const cacheMaterial = buildVertexSoapCacheMaterial({
        systemPrompt: 'STATIC SYSTEM RULES',
        interventionBankContext: '\n- CBT'
    });
    const cachedPayload = buildVertexCachedSoapPayload({
        cacheName: 'projects/p/locations/global/cachedContents/c1',
        userPrompt: 'CLIENT PHI'
    });
    const directPayload = buildVertexDirectSoapPayload({
        systemPrompt: 'STATIC SYSTEM RULES',
        interventionBankContext: '\n- CBT',
        userPrompt: 'CLIENT PHI'
    });

    assert.match(JSON.stringify(cacheMaterial), /STATIC SYSTEM RULES/);
    assert.doesNotMatch(JSON.stringify(cacheMaterial), /CLIENT PHI/);
    assert.equal(cachedPayload.cachedContent, 'projects/p/locations/global/cachedContents/c1');
    assert.doesNotMatch(JSON.stringify(cachedPayload), /STATIC SYSTEM RULES/);
    assert.match(JSON.stringify(cachedPayload), /CLIENT PHI/);
    assert.match(JSON.stringify(directPayload), /STATIC SYSTEM RULES/);
    assert.match(JSON.stringify(directPayload), /CLIENT PHI/);
});

test('counts eligible context and creates a workday cache on the global endpoint', async () => {
    const requests = [];
    const storage = createStorage();
    const cacheMaterial = buildVertexSoapCacheMaterial({
        systemPrompt: 'rules',
        interventionBankContext: '\n- intervention'
    });
    const fetchImpl = async (url, options) => {
        requests.push({ url, body: JSON.parse(options.body) });
        if (url.endsWith(':countTokens')) {
            return makeJsonResponse({ totalTokens: 5000 });
        }
        return makeJsonResponse({
            name: 'projects/p/locations/global/cachedContents/c1',
            expireTime: '2030-01-01T01:00:00Z'
        });
    };

    const result = await getOrCreateVertexSoapContextCache({
        accessToken: 'token',
        cacheMaterial,
        fetchImpl,
        location: 'global',
        modelId: 'gemini-3.5-flash',
        now: Date.parse('2030-01-01T00:00:00Z'),
        projectId: 'p',
        storage
    });

    assert.equal(result.reason, 'created');
    assert.equal(requests.length, 2);
    assert.match(requests[0].url, /^https:\/\/aiplatform\.googleapis\.com\//);
    assert.match(requests[1].url, /\/cachedContents$/);
    assert.equal(requests[1].body.ttl, '54000s');
    assert.equal(requests[1].body.model, 'projects/p/locations/global/publishers/google/models/gemini-3.5-flash');
    assert.doesNotMatch(JSON.stringify(requests[1].body), /CLIENT PHI/);

    const reused = await getOrCreateVertexSoapContextCache({
        accessToken: 'token',
        cacheMaterial,
        fetchImpl,
        location: 'global',
        modelId: 'gemini-3.5-flash',
        now: Date.parse('2030-01-01T00:10:00Z'),
        projectId: 'p',
        storage
    });
    assert.equal(reused.reason, 'reused');
    assert.equal(requests.length, 2);

    invalidateVertexContextCache({
        storage,
        storageKey: reused.storageKey
    });
});

test('uses implicit caching when explicit caching is unavailable or below the minimum', async () => {
    let calls = 0;
    const cacheMaterial = buildVertexSoapCacheMaterial({
        systemPrompt: 'rules',
        interventionBankContext: '\n- intervention'
    });

    const previewResult = await getOrCreateVertexSoapContextCache({
        accessToken: 'token',
        cacheMaterial,
        fetchImpl: async () => {
            calls += 1;
            return makeJsonResponse({});
        },
        location: 'us-central1',
        modelId: 'gemini-3.1-pro-preview',
        projectId: 'p',
        storage: createStorage()
    });
    assert.equal(previewResult.reason, 'implicit-only');
    assert.equal(calls, 0);

    const smallResult = await getOrCreateVertexSoapContextCache({
        accessToken: 'token',
        cacheMaterial,
        fetchImpl: async () => {
            calls += 1;
            return makeJsonResponse({ totalTokens: 1000 });
        },
        location: 'us-central1',
        modelId: 'gemini-2.5-flash',
        projectId: 'p',
        storage: createStorage()
    });
    assert.equal(smallResult.reason, 'below-minimum');
    assert.equal(calls, 1);
    assert.equal(getVertexContextCacheMinimumTokens('gemini-2.5-flash'), 2048);
    assert.equal(getVertexContextCacheMinimumTokens('gemini-3.5-flash'), 4096);
});
