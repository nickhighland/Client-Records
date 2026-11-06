export const getResolvedSoapAuditResult = (auditResult) => {
    if (!auditResult) return null;
    const manualOverrides = auditResult.manualOverrides && typeof auditResult.manualOverrides === 'object'
        ? auditResult.manualOverrides
        : {};
    const checks = (auditResult.checks || []).map(check => ({
        ...check,
        manualOverride: !!manualOverrides[check.label],
        pass: !!check.pass || !!manualOverrides[check.label]
    }));
    const passedCount = checks.filter(check => check.pass).length;
    const score = checks.length > 0 ? Math.round((passedCount / checks.length) * 100) : 0;
    const criticalLabels = new Set([
        'All SOAP sections completed',
        'Medical Necessity is documented',
        'Subjective includes functional impact'
    ]);
    const failedCritical = checks.filter(check => !check.pass && criticalLabels.has(check.label));
    const likelyPass = score >= 80 && failedCritical.length === 0;

    return {
        ...auditResult,
        checks,
        score,
        likelyPass,
        opportunities: checks.filter(check => !check.pass).map(check => check.remedy),
        summary: likelyPass
            ? 'Likely audit-ready based on configured SOAP criteria.'
            : 'This note can be strengthened for stronger audit support. Suggested refinements are listed below.'
    };
};

const containsAny = (text, patterns) => patterns.some(pattern => pattern.test(text));

export const getAuditProofingData = (appointment) => {
    if (!appointment) {
        return {
            symptoms: '',
            functionalImpact: '',
            progressResponse: '',
            medicalNecessity: ''
        };
    }

    const raw = appointment.auditProofing;
    if (!raw) {
        return {
            symptoms: '',
            functionalImpact: '',
            progressResponse: '',
            medicalNecessity: ''
        };
    }

    if (typeof raw === 'string') {
        return {
            symptoms: '',
            functionalImpact: '',
            progressResponse: raw,
            medicalNecessity: ''
        };
    }

    return {
        symptoms: raw.symptoms || '',
        functionalImpact: raw.functionalImpact || '',
        progressResponse: raw.progressResponse || '',
        medicalNecessity: raw.medicalNecessity || ''
    };
};


export const getSoapAuditProofingContext = (appointment) => {
    const auditProofing = getAuditProofingData(appointment);
    const contextParts = [];
    if (auditProofing.symptoms) {
        contextParts.push(`\n- **Audit (Subjective):**\n${auditProofing.symptoms}`);
    }
    const assessmentParts = [auditProofing.functionalImpact, auditProofing.progressResponse]
        .filter(Boolean)
        .join('\n\n');
    if (assessmentParts) {
        contextParts.push(`\n- **Audit (Assessment):**\n${assessmentParts}`);
    }
    if (auditProofing.medicalNecessity) {
        contextParts.push(`\n- **Audit (Medical Necessity):**\n${auditProofing.medicalNecessity}`);
    }
    return contextParts.join('');
};


export const hasAppointmentGenerationInput = (appointment) => {
    if (!appointment) return false;
    const hasSessionInfo = !!(appointment.sessionInfo || '').trim();
    const auditProofing = getAuditProofingData(appointment);
    const hasAuditProofing = Object.values(auditProofing).some(value => !!(value || '').trim());
    return hasSessionInfo || hasAuditProofing;
};

export const runSoapAuditCheck = (client, appointment) => {
    const soap = appointment?.soap || {};
    const auditProofing = getAuditProofingData(appointment);
    const sectionText = {
        s: (soap.s || '').trim(),
        o: (soap.o || '').trim(),
        a: (soap.a || '').trim(),
        p: (soap.p || '').trim(),
        i: (soap.interventions || '').trim(),
        medicalNecessity: (soap.medicalNecessity || auditProofing.medicalNecessity || '').trim()
    };

    const auditProofingText = `${auditProofing.symptoms}\n${auditProofing.functionalImpact}\n${auditProofing.progressResponse}\n${auditProofing.medicalNecessity}`.toLowerCase();

    const fullText = `${sectionText.s}\n${sectionText.o}\n${sectionText.a}\n${sectionText.p}\n${sectionText.i}`.toLowerCase();
    const sessionText = (appointment?.sessionInfo || '').toLowerCase();
    const combined = `${fullText}\n${sessionText}\n${auditProofingText}`;

    const checks = [
        {
            label: 'Subjective includes symptom detail',
            pass: sectionText.s.length >= 20 && containsAny(sectionText.s.toLowerCase(), [/anx|depress|panic|sleep|mood|stress|irritab|fear|sad|worry|symptom/]),
            remedy: 'Add symptom frequency/intensity language (for example, how often and how severe symptoms were this session).'
        },
        {
            label: 'Subjective includes functional impact',
            pass: containsAny(`${sectionText.s.toLowerCase()}\n${auditProofingText}`, [/work|school|relationship|parent|sleep|concentrat|avoid|function|impair/]),
            remedy: 'Describe where symptoms impacted functioning (work, school, relationships, sleep, parenting, or daily tasks).'
        },
        {
            label: 'Objective includes observable/MSE data',
            pass: sectionText.o.length >= 20 && containsAny(sectionText.o.toLowerCase(), [/affect|mood|speech|oriented|orientation|appearance|behavior|thought|engaged|observed|denies/]),
            remedy: 'Include at least 1–2 observed findings (appearance, affect, speech, orientation, thought process, engagement).'
        },
        {
            label: 'Assessment states progress/clinical interpretation',
            pass: sectionText.a.length >= 20 && containsAny(`${sectionText.a.toLowerCase()}\n${auditProofingText}`, [/progress|partial|interfer|impair|deteriorat|required|diagnos|consistent with/]),
            remedy: 'Add clinical interpretation describing the diagnosis-linked need, progress, response, or remaining barriers documented this session.'
        },
        {
            label: 'Medical Necessity is documented',
            pass: sectionText.medicalNecessity.length >= 20 && containsAny(sectionText.medicalNecessity.toLowerCase(), [/medically necessary|skilled treatment|continued treatment|ongoing treatment/]),
            remedy: 'Add a separate statement explaining why ongoing skilled treatment remains medically necessary now.'
        },
        {
            label: 'Plan includes intervention + next step',
            pass: sectionText.p.length >= 20 && containsAny(sectionText.p.toLowerCase(), [/continue|next session|follow-up|homework|assign|reassess|weekly|referral|coordinate|safety plan/]),
            remedy: 'Add a concrete next-step plan (homework/follow-up/reassessment target) and tie it to ongoing symptoms.'
        },
        {
            label: 'Interventions documented',
            pass: sectionText.i.length >= 12 && sectionText.i.toLowerCase() !== 'no interventions identified.',
            remedy: 'List techniques used today (for example CBT, reframing, exposure, grounding, psychoeducation) and client response.'
        },
        {
            label: 'All SOAP sections completed',
            pass: sectionText.s.length > 3 && sectionText.o.length > 3 && sectionText.a.length > 3 && sectionText.p.length > 3,
            remedy: 'Complete S, O, A, and P with individualized content before finalizing.'
        }
    ];

    return {
        score: 0,
        likelyPass: false,
        checks,
        manualOverrides: {},
        opportunities: checks.filter(check => !check.pass).map(check => check.remedy),
        timestamp: new Date().toISOString(),
        summary: 'This note can be strengthened for stronger audit support. Suggested refinements are listed below.'
    };
};

