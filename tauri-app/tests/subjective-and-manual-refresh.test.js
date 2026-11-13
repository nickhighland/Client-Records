import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

for (const path of ['index.html', 'src/index.html']) {
    test(`${path} never generates or displays Subjective suggestions`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
        const subjectiveStart = html.indexOf('<div class="soap-section" data-soap-section-key="s">');
        const objectiveStart = html.indexOf('<div class="soap-section" data-soap-section-key="o">', subjectiveStart);
        const subjectiveCard = html.slice(subjectiveStart, objectiveStart);
        const promptStart = html.indexOf('const buildSoapSystemPrompt =');
        const promptEnd = html.indexOf('const DEFAULT_SOAP_SYSTEM_PROMPT =', promptStart);
        const prompt = html.slice(promptStart, promptEnd);
        const processStart = html.indexOf('const processAndStoreSoapData =');
        const processEnd = html.indexOf('const completeGeneratedSoapNote =', processStart);
        const processing = html.slice(processStart, processEnd);

        assert.ok(subjectiveStart >= 0 && objectiveStart > subjectiveStart);
        assert.doesNotMatch(subjectiveCard, /s_suggestion|renderSuggestionBox/);
        assert.match(prompt, /Never create or return suggestions for Subjective/);
        assert.match(prompt, /Subjective never has suggestions/);
        assert.doesNotMatch(prompt, /"s_suggestion"\s*:/);
        assert.match(processing, /let suggestions = key === 's' \? \[\] : \(soapData\[suggestionKey\] \|\| \[\]\)/);
        assert.match(processing, /if \(key === 's'\) delete appointment\.soap\[suggestionKey\]/);
    });

    test(`${path} wires manual Objective refresh actions directly and enables them for reviewed text`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
        const refreshStart = html.indexOf('const refreshObjectiveActionButtons =');
        const refreshEnd = html.indexOf('const syncObjectiveInterventionsFromObjectiveText =', refreshStart);
        const refreshButtons = html.slice(refreshStart, refreshEnd);
        const supportStart = html.indexOf('const getObjectiveSupportRefreshBlockMessage =');
        const supportEnd = html.indexOf('const refreshDiagnosticSupport =', supportStart);
        const supportGuard = html.slice(supportStart, supportEnd);
        const bindingStart = html.indexOf('const bindSoapRefreshAction =');
        const bindingEnd = html.indexOf('refreshObjectiveActionButtons(appointment);', bindingStart);
        const bindings = html.slice(bindingStart, bindingEnd);

        assert.match(refreshButtons, /Boolean\(objectiveText\) && !hasPendingReview && !isOrganizing && !isReviewPreparing/);
        assert.match(refreshButtons, /generateInterventionsBtn\.disabled = !canGenerateFromObjective/);
        assert.match(refreshButtons, /button\.disabled = !canGenerateFromObjective/);
        const renderStart = html.indexOf('const objectiveDerivedInterventions = getObjectiveDerivedInterventions(appointment, client);');
        const renderEnd = html.indexOf('const auditResult = appointment.auditCheck || null;', renderStart);
        const interventionRender = html.slice(renderStart, renderEnd);
        assert.match(interventionRender, /objectiveOrganized \|\| objectiveDerivedInterventions\.length > 0/);
        assert.doesNotMatch(interventionRender, /const objectiveDerivedInterventions = objectiveOrganized/);
        assert.match(supportGuard, /String\(appointment\?\.soap\?\.o \|\| ''\)\.trim\(\)/);
        assert.doesNotMatch(supportGuard, /isObjectiveOrganizeCompleted/);
        assert.match(bindings, /event\.stopPropagation\(\)/);
        for (const buttonId of [
            'generateInterventionsBtn',
            'refreshDiagnosticSupportBtn',
            'refreshMedicalNecessityBtn',
            'refreshInterventionsAndPurposeBtn'
        ]) {
            assert.match(bindings, new RegExp(`bindSoapRefreshAction\\('${buttonId}'`));
        }
        assert.match(html, /const blockMessage = getObjectiveSupportRefreshBlockMessage\(appointment\)/);
    });
}
