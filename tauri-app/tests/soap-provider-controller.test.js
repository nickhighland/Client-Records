import test from 'node:test';
import assert from 'node:assert/strict';
import { createSoapProviderController } from '../src/features/soap/provider-controller.js';

const createDependencies = overrides => {
    const clients = {
        one: { id: 'one', name: 'Ct One' },
        two: { id: 'two', name: 'Ct Two' }
    };
    const appointments = {
        first: { id: 'first', sessionInfo: 'first session' },
        second: { id: 'second', sessionInfo: 'second session' }
    };
    let state = {
        selectedModel: 'test-model',
        openaiApiKey: 'test-key',
        vertexServiceAccount: '',
        vertexLocation: '',
        selectedClientId: 'one',
        selectedAppointmentId: 'first',
        systemPrompt: 'Use Ct and Writer.',
        apiKey: '',
        serverAddress: '',
        ollamaAddress: ''
    };
    const requests = [];
    const completed = [];
    const controller = createSoapProviderController({
        getProviderState: () => state,
        findClient: id => clients[id],
        findAppointment: (_client, id) => appointments[id],
        hasAppointmentGenerationInput: appointment => Boolean(appointment?.sessionInfo),
        getTreatmentGoalsContext: () => '\nTreatment goals',
        getCandidateObjectivesContext: () => '\nCandidate objectives',
        getInterventionContext: () => '\nIntervention context',
        getInterventionBankContext: () => '\nIntervention bank',
        getSelectedInterventionContext: () => '\nSelected interventions',
        getClientSoapModalityContext: () => '\nModality context',
        getInstructionsContext: () => '\nInstructions',
        getSoapAuditProofingContext: () => '\nAudit context',
        tauriFetch: (url, options) => new Promise(resolve => requests.push({ url, options, resolve })),
        completeGeneratedSoapNote: async (_soap, appointment, client) => completed.push({ appointment, client }),
        updateGenerateNoteButtonState: () => {},
        getGoogleAccessToken: async () => 'token',
        buildVertexCachedSoapPayload: () => ({}),
        buildVertexDirectSoapPayload: () => ({}),
        buildVertexSoapCacheMaterial: () => ({}),
        getOrCreateVertexSoapContextCache: async () => null,
        invalidateVertexContextCache: () => {},
        rememberVertexEffectiveLocation: () => {},
        requestVertexGenerateContent: async () => ({}),
        ...overrides
    });
    return {
        controller,
        requests,
        completed,
        setState: next => { state = { ...state, ...next }; }
    };
};

const successfulOpenAiResponse = note => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(note) } }] })
});

test('SOAP provider requests retain the configured prompts and API credentials', async () => {
    const { controller, requests } = createDependencies();
    const generation = controller.generateSoapNoteWithOpenAI();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, 'https://api.openai.com/v1/chat/completions');
    assert.equal(requests[0].options.headers.Authorization, 'Bearer test-key');
    const payload = JSON.parse(requests[0].options.body);
    assert.equal(payload.messages[0].content, 'Use Ct and Writer.');
    assert.match(payload.messages[1].content, /first session/);
    requests[0].resolve(successfulOpenAiResponse({ s: 'Generated note' }));
    await generation;
});

test('concurrent SOAP generations stay attached to the client and appointment selected at start', async () => {
    const { controller, requests, completed, setState } = createDependencies();
    const firstGeneration = controller.generateSoapNoteWithOpenAI();
    setState({ selectedClientId: 'two', selectedAppointmentId: 'second' });
    const secondGeneration = controller.generateSoapNoteWithOpenAI();

    assert.equal(requests.length, 2);
    requests[1].resolve(successfulOpenAiResponse({ s: 'Second note' }));
    await secondGeneration;
    requests[0].resolve(successfulOpenAiResponse({ s: 'First note' }));
    await firstGeneration;

    assert.deepEqual(completed, [
        { client: { id: 'two', name: 'Ct Two' }, appointment: { id: 'second', sessionInfo: 'second session' } },
        { client: { id: 'one', name: 'Ct One' }, appointment: { id: 'first', sessionInfo: 'first session' } }
    ]);
});
