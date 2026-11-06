import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getAuditProofingData,
    getResolvedSoapAuditResult,
    getSoapAuditProofingContext,
    hasAppointmentGenerationInput,
    runSoapAuditCheck
} from '../src/features/soap/audit-model.js';

test('audit proofing normalization retains legacy and structured values', () => {
    assert.deepEqual(getAuditProofingData({ auditProofing: 'legacy progress note' }), {
        symptoms: '',
        functionalImpact: '',
        progressResponse: 'legacy progress note',
        medicalNecessity: ''
    });
    assert.deepEqual(getAuditProofingData({ auditProofing: { symptoms: 'Anxiety', functionalImpact: 'Work', extra: 'ignored' } }), {
        symptoms: 'Anxiety',
        functionalImpact: 'Work',
        progressResponse: '',
        medicalNecessity: ''
    });
});

test('audit proofing context and generation readiness use saved session fields', () => {
    const appointment = {
        auditProofing: { symptoms: 'Anxiety increased', functionalImpact: 'Work was affected' }
    };
    assert.equal(hasAppointmentGenerationInput(appointment), true);
    assert.equal(hasAppointmentGenerationInput({}), false);
    assert.match(getSoapAuditProofingContext(appointment), /Audit \(Subjective\)/);
    assert.match(getSoapAuditProofingContext(appointment), /Audit \(Assessment\)/);
});

test('SOAP audit checks required content and applies manual overrides', () => {
    const appointment = {
        sessionInfo: 'Ct described anxiety affecting work.',
        soap: {
            s: 'Ct reported anxiety and sleep disruption affecting work.',
            o: 'Ct was engaged with congruent affect and organized speech.',
            a: 'Symptoms remain consistent with anxiety, with partial progress.',
            p: 'Continue weekly treatment and reassess coping next session.',
            interventions: 'Cognitive reframing and grounding practice.',
            medicalNecessity: 'Ongoing skilled treatment remains medically necessary.'
        }
    };
    const result = runSoapAuditCheck(null, appointment);
    const resolved = getResolvedSoapAuditResult({
        ...result,
        manualOverrides: { 'All SOAP sections completed': true }
    });

    assert.equal(result.checks.length, 8);
    assert.equal(resolved.checks.find(check => check.label === 'All SOAP sections completed').pass, true);
    assert.equal(resolved.score, 100);
    assert.equal(resolved.likelyPass, true);
});
