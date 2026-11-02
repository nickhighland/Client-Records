import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

for (const path of ['index.html', 'src/index.html']) {
    test(`${path} protects Organize from Vertex rate limits`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');

        assert.match(html, /const VERTEX_MIN_REQUEST_GAP_MS = 750/);
        assert.match(html, /const VERTEX_429_RETRY_LIMIT = 3/);
        assert.match(html, /error\.vertexStatus = response\.status/);
        assert.match(html, /const requestVertexGenerateContent = \(options\) => enqueueVertexRequest/);
        assert.match(html, /isVertexRateLimited = true/);
        assert.match(html, /const fetchSupportFieldsFromAI =/);
        assert.match(html, /presenting_problem/);
        assert.match(html, /supportFields = await fetchSupportFieldsFromAI\(client, appointment\)/);
        assert.match(html, /appointment\.soap\.presentingProblem = normalizeCoupleCollectiveReferences\(supportFields\.presentingProblem, client\)/);
        assert.match(html, /let objectiveOrganizationInFlight = false/);
        assert.match(html, /const normalizeObjectiveRedundancyGroupsFromAi =/);
        assert.match(html, /Strict redundancy definition/);
        assert.match(html, /Shared topic or category is not redundancy/);
        assert.match(html, /prefer a false negative over a false positive/);
        assert.match(html, /const getObjectiveRedundancySuggestionItems =/);
        assert.match(html, /const buildObjectiveRedundancyReviewData =/);
        assert.match(html, /const fetchObjectiveRedundancyReviewFromAI =/);
        assert.match(html, /Suggested Objective/);
        assert.match(html, /Groups must be disjoint/);
        assert.match(html, /const prepareObjectiveRedundancyReview = async/);
        assert.match(html, /appointment\.soap\.objectiveRedundancyReview = \{/);
        assert.match(html, /const completeGeneratedSoapNote = async/);
        assert.match(html, /await prepareObjectiveRedundancyReview\(appointment, client\)/);
        assert.match(html, /id="objectiveRedundancyReview"/);
        assert.match(html, /class="objective-redundancy-checkbox"/);
        assert.match(html, /id="approveObjectiveRedundancyBtn"/);
        assert.match(html, /id="dismissObjectiveRedundancyBtn"/);
        assert.match(html, /const setObjectiveRedundancyItemSelected =/);
        assert.match(html, /const applyObjectiveRedundancyDecision =/);
        assert.match(html, /Dismiss all Objective redundancy review options/);
        assert.match(html, /addEventListener\('change', \(e\) =>/);
        assert.match(html, /organizeObjectiveBtn\.disabled = false/);
        assert.match(html, /class="soap-action-spinner"/);
        assert.match(html, /const setSoapPostObjectiveProcessingState =/);
        assert.match(html, /className = 'soap-processing-status'/);
        assert.match(html, /setSoapPostObjectiveProcessingState\(true\)/);
        assert.match(html, /Objective Grouping/);
        assert.match(html, /objective-redundancy-group-container/);
        assert.match(html, /const getObjectiveRedundancyDecision =/);
        assert.match(html, /const pendingRedundancyReview = getObjectiveRedundancyReview\(appointment\)/);
        assert.match(html, /appointment\.soap\.o_suggestion = pendingRedundancyDecision/);
        assert.match(html, /isObjectiveOrganizeCompleted\(appointment\) \? '' : \(soapData\.o_suggestion/);
        assert.doesNotMatch(html, /objective-redundancy-decline/);
        assert.doesNotMatch(html, /const \[diagnosticResult, medicalNecessityResult\] = await Promise\.allSettled/);
    });
}
