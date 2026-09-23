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
        assert.match(html, /supportFields = await fetchSupportFieldsFromAI\(client, appointment\)/);
        assert.match(html, /let objectiveOrganizationInFlight = false/);
        assert.doesNotMatch(html, /const \[diagnosticResult, medicalNecessityResult\] = await Promise\.allSettled/);
    });
}
