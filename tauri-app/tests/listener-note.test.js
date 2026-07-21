import test from 'node:test';
import assert from 'node:assert/strict';

import { applyGeneratedListenerNote } from '../src/listener-note.js';

const bullets = value => `formatted:${value}`;

test('fills SOAP and audit-proofing fields on the bound appointment', () => {
    const context = {
        client: { nextSessionNotes: '' },
        appointment: { id: 'appointment-a', sessionInfo: '', soap: {}, auditProofing: {} }
    };
    const result = applyGeneratedListenerNote(context, {
        sessionInfo: 'Session summary',
        auditProofing: {
            symptoms: 'Daily anxiety rated 7/10.',
            functionalImpact: 'Anxiety disrupted sleep.',
            progressResponse: 'Used grounding with partial relief.',
            medicalNecessity: 'Continued skilled treatment is needed for persistent impairment.'
        },
        soap: { s: 'Subjective', o: 'Objective', a: 'Assessment', p: 'Plan' },
        interventions: ['Grounding', 'CBT'],
        goalProgress: ['Practiced coping skill'],
        nextSessionNotes: 'Review sleep routine.'
    }, bullets);

    assert.equal(context.appointment.sessionInfo, 'Session summary');
    assert.deepEqual(context.appointment.auditProofing, {
        symptoms: 'Daily anxiety rated 7/10.',
        functionalImpact: 'Anxiety disrupted sleep.',
        progressResponse: 'Used grounding with partial relief.',
        medicalNecessity: 'Continued skilled treatment is needed for persistent impairment.'
    });
    assert.equal(context.appointment.soap.s, 'formatted:Subjective');
    assert.equal(context.appointment.soap.interventions, 'formatted:Grounding\nCBT');
    assert.equal(context.client.nextSessionNotes, 'Review sleep routine.');
    assert.deepEqual(result, { goalProgress: 'Practiced coping skill' });
});

test('does not erase clinician content when a generated field is empty', () => {
    const context = {
        client: { nextSessionNotes: 'Existing next-session note' },
        appointment: {
            sessionInfo: 'Existing session information',
            soap: { s: 'Existing subjective', o: '', a: '', p: '' },
            auditProofing: {
                symptoms: 'Existing symptoms',
                functionalImpact: 'Existing impact',
                progressResponse: '',
                medicalNecessity: ''
            }
        }
    };

    applyGeneratedListenerNote(context, {
        sessionInfo: '',
        auditProofing: { symptoms: '', functionalImpact: '', progressResponse: '', medicalNecessity: '' },
        soap: { s: '', o: '', a: '', p: '' },
        interventions: [],
        goalProgress: [],
        nextSessionNotes: ''
    }, bullets);

    assert.equal(context.appointment.sessionInfo, 'Existing session information');
    assert.equal(context.appointment.soap.s, 'Existing subjective');
    assert.equal(context.appointment.auditProofing.symptoms, 'Existing symptoms');
    assert.equal(context.appointment.auditProofing.functionalImpact, 'Existing impact');
    assert.equal(context.client.nextSessionNotes, 'Existing next-session note');
});

test('rejects a generated note without its bound chart context', () => {
    assert.throws(
        () => applyGeneratedListenerNote(null, { soap: {} }, bullets),
        /could not be matched to its appointment/
    );
});
