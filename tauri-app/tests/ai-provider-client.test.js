import test from 'node:test';
import assert from 'node:assert/strict';
import { createAiProviderClient } from '../src/services/ai-provider-client.js';

const response = payload => ({
    ok: true,
    json: async () => payload,
    text: async () => JSON.stringify(payload)
});

test('OpenAI requests preserve the system and user prompts and return parsed JSON', async () => {
    let request;
    const client = createAiProviderClient({
        getConfig: () => ({ apiProvider: 'openai', selectedModel: 'gpt-test', openaiApiKey: 'secret' }),
        fetchImpl: async (url, options) => {
            request = { url, options };
            return response({ choices: [{ message: { content: '{"ok":true}' } }] });
        }
    });

    assert.deepEqual(await client.requestJsonObjectFromCurrentProvider('system', 'session'), { ok: true });
    assert.equal(request.url, 'https://api.openai.com/v1/chat/completions');
    assert.deepEqual(JSON.parse(request.options.body), {
        model: 'gpt-test',
        messages: [{ role: 'system', content: 'system' }, { role: 'user', content: 'session' }],
        response_format: { type: 'json_object' }
    });
});

test('Open WebUI preserves optional bearer auth and non-streaming JSON output', async () => {
    let request;
    const client = createAiProviderClient({
        getConfig: () => ({ apiProvider: 'openwebui', selectedModel: 'local-model', serverAddress: 'http://localhost:3000', apiKey: 'token' }),
        fetchImpl: async (url, options) => {
            request = { url, options };
            return response({ choices: [{ message: { content: '{"source":"openwebui"}' } }] });
        }
    });

    assert.deepEqual(await client.requestJsonObjectFromCurrentProvider('rules', 'note'), { source: 'openwebui' });
    assert.equal(request.url, 'http://localhost:3000/api/v1/chat/completions');
    assert.equal(request.options.headers.get('Authorization'), 'Bearer token');
    assert.equal(JSON.parse(request.options.body).stream, false);
});

test('Ollama trims the configured endpoint before sending chat completions', async () => {
    let requestedUrl = '';
    const client = createAiProviderClient({
        getConfig: () => ({ apiProvider: 'ollama', selectedModel: 'clinical-local', ollamaAddress: 'http://localhost:11434/' }),
        fetchImpl: async url => {
            requestedUrl = url;
            return response({ choices: [{ message: { content: '{"ok":1}' } }] });
        }
    });

    assert.deepEqual(await client.requestJsonObjectFromCurrentProvider('rules', 'note'), { ok: 1 });
    assert.equal(requestedUrl, 'http://localhost:11434/v1/chat/completions');
});

test('Vertex request uses the selected location and stores the effective response location', async () => {
    const calls = [];
    const client = createAiProviderClient({
        getConfig: () => ({
            apiProvider: 'vertex',
            selectedModel: 'gemini-test',
            vertexServiceAccount: '{"project_id":"project"}',
            vertexLocation: 'us-central1'
        }),
        getGoogleAccessToken: async credentials => {
            calls.push(['token', credentials]);
            return 'access-token';
        },
        requestVertexGenerateContent: async request => {
            calls.push(['vertex', request]);
            return { location: 'global', response: response({ candidates: [{ content: { parts: [{ text: '{"ready":true}' }] } }] }) };
        },
        rememberVertexEffectiveLocation: location => calls.push(['location', location])
    });

    assert.deepEqual(await client.requestJsonObjectFromCurrentProvider('system', 'session'), { ready: true });
    assert.equal(calls[1][1].location, 'us-central1');
    assert.equal(calls[1][1].projectId, 'project');
    assert.deepEqual(calls[2], ['location', 'global']);
});

test('provider selection errors before making a network request', async () => {
    let fetched = false;
    const client = createAiProviderClient({
        getConfig: () => ({ apiProvider: 'openai', selectedModel: '', openaiApiKey: 'secret' }),
        fetchImpl: async () => {
            fetched = true;
            return response({});
        }
    });

    await assert.rejects(client.requestJsonObjectFromCurrentProvider('system', 'session'), /select a model/);
    assert.equal(fetched, false);
});
