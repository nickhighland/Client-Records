import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('the app remains SmartEMR and checks the renamed public release repository', async () => {
    const config = JSON.parse(await readFile(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'));
    const publishScript = await readFile(new URL('../../publish.sh', import.meta.url), 'utf8');

    assert.equal(config.productName, 'SmartEMR');
    assert.equal(config.version, '4.0.9');
    assert.deepEqual(config.plugins.updater.endpoints, [
        'https://github.com/ProbablyModded/Concept-EMR/releases/latest/download/latest.json'
    ]);
    assert.match(publishScript, /REPO="ProbablyModded\/Concept-EMR"/);
});
