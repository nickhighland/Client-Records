import test from 'node:test';
import assert from 'node:assert/strict';

import {
    choosePreferredVertexModel,
    fetchVertexGeminiModelCatalog,
    getVertexApiHost,
    normalizeVertexPublisherModels
} from '../src/vertex-models.js';

test('normalizes current general-purpose Gemini models and excludes specialized models', () => {
    const models = normalizeVertexPublisherModels([
        {
            name: 'publishers/google/models/gemini-3.5-flash',
            launchStage: 'GA',
            versionState: 'VERSION_STATE_STABLE'
        },
        {
            name: 'publishers/google/models/gemini-3.1-pro-preview',
            launchStage: 'PUBLIC_PREVIEW',
            versionState: 'VERSION_STATE_UNSTABLE'
        },
        { name: 'publishers/google/models/gemini-3.1-flash-image' },
        { name: 'publishers/google/models/gemini-live-2.5-flash-native-audio' },
        { name: 'publishers/google/models/gemini-embedding-001' },
        { name: 'publishers/google/models/text-embedding-005' },
        { name: 'publishers/google/models/gemini-private', launchStage: 'PRIVATE_PREVIEW' }
    ]);

    assert.deepEqual(models, [
        {
            id: 'gemini-3.5-flash',
            category: 'stable',
            launchStage: 'GA',
            versionState: 'VERSION_STATE_STABLE'
        },
        {
            id: 'gemini-3.1-pro-preview',
            category: 'preview',
            launchStage: 'PUBLIC_PREVIEW',
            versionState: 'VERSION_STATE_UNSTABLE'
        }
    ]);
});

test('retrieves every page from the documented publisherModels response', async () => {
    const requestedUrls = [];
    const responses = [
        {
            publisherModels: [{ name: 'publishers/google/models/gemini-3.5-flash', launchStage: 'GA' }],
            nextPageToken: 'next page'
        },
        {
            publisherModels: [{ name: 'publishers/google/models/gemini-3.1-pro-preview', launchStage: 'PUBLIC_PREVIEW' }]
        }
    ];
    const fetchImpl = async (url, options) => {
        requestedUrls.push({ url: new URL(url), options });
        return {
            ok: true,
            json: async () => responses.shift()
        };
    };

    const models = await fetchVertexGeminiModelCatalog({
        accessToken: 'token',
        fetchImpl,
        location: 'us-central1'
    });

    assert.equal(requestedUrls.length, 2);
    assert.equal(requestedUrls[0].url.host, 'us-central1-aiplatform.googleapis.com');
    assert.equal(requestedUrls[0].url.pathname, '/v1beta1/publishers/google/models');
    assert.equal(requestedUrls[0].url.searchParams.get('listAllVersions'), 'false');
    assert.equal(requestedUrls[1].url.searchParams.get('pageToken'), 'next page');
    assert.equal(requestedUrls[0].options.headers.Authorization, 'Bearer token');
    assert.deepEqual(models.map(model => model.id), [
        'gemini-3.5-flash',
        'gemini-3.1-pro-preview'
    ]);
});

test('rejects the obsolete models response shape instead of silently using stale data', async () => {
    await assert.rejects(
        fetchVertexGeminiModelCatalog({
            accessToken: 'token',
            location: 'global',
            fetchImpl: async () => ({
                ok: true,
                json: async () => ({ models: [] })
            })
        }),
        /unexpected model catalog response/
    );
});

test('uses the global host and favors a stable Flash model by default', () => {
    assert.equal(getVertexApiHost('GLOBAL'), 'aiplatform.googleapis.com');
    assert.equal(choosePreferredVertexModel([
        { id: 'gemini-3.5-pro', category: 'stable' },
        { id: 'gemini-3.5-flash', category: 'stable' },
        { id: 'gemini-3.6-flash-preview', category: 'preview' }
    ]).id, 'gemini-3.5-flash');
});
