const nonEmptyText = value => String(value || '').trim();

const listText = value => Array.isArray(value)
    ? value.map(nonEmptyText).filter(Boolean).join('\n')
    : nonEmptyText(value);

export const applyGeneratedListenerNote = (context, generatedNote, formatBulletPoints) => {
    const { appointment, client } = context || {};
    if (!appointment || !client || !generatedNote || typeof generatedNote !== 'object') {
        throw new Error('The generated Listener note could not be matched to its appointment.');
    }

    const sessionInfo = nonEmptyText(generatedNote.sessionInfo);
    if (sessionInfo) appointment.sessionInfo = sessionInfo;

    const generatedAudit = generatedNote.auditProofing || {};
    const existingAudit = appointment.auditProofing || {};
    appointment.auditProofing = {
        symptoms: nonEmptyText(generatedAudit.symptoms) || nonEmptyText(existingAudit.symptoms),
        functionalImpact: nonEmptyText(generatedAudit.functionalImpact) || nonEmptyText(existingAudit.functionalImpact),
        progressResponse: nonEmptyText(generatedAudit.progressResponse) || nonEmptyText(existingAudit.progressResponse),
        medicalNecessity: nonEmptyText(generatedAudit.medicalNecessity) || nonEmptyText(existingAudit.medicalNecessity)
    };

    const generatedSoap = generatedNote.soap || {};
    if (!appointment.soap || typeof appointment.soap !== 'object') {
        appointment.soap = { s: '', o: '', a: '', p: '' };
    }
    ['s', 'o', 'a', 'p'].forEach(key => {
        const value = nonEmptyText(generatedSoap[key]);
        if (value) appointment.soap[key] = formatBulletPoints(value);
    });

    const interventions = listText(generatedNote.interventions);
    if (interventions) appointment.soap.interventions = formatBulletPoints(interventions);

    const nextSessionNotes = nonEmptyText(generatedNote.nextSessionNotes);
    if (nextSessionNotes) client.nextSessionNotes = nextSessionNotes;
    delete appointment.auditCheck;

    return { goalProgress: listText(generatedNote.goalProgress) };
};
