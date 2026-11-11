import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const paths = ['index.html', 'src/index.html'];

for (const path of paths) {
    test(`${path} preserves the SOAP layout when regenerating an existing note`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');

        assert.match(html, /const hasStoredSoapContent = \(appointment\) =>/);
        assert.match(html, /if \(snapshotKeys\) return snapshotKeys;\s*if \(!hasStoredSoapContent\(appointment\) && getClientSoapPlatform\(client\)\)/);
        assert.match(html, /if \(!appointment \|\| appointment\.soapPlatformSnapshot \|\| hasStoredSoapContent\(appointment\)\) return false;/);
        assert.match(html, /appointment\.soapPlatformSnapshot = createSoapPlatformSnapshot\(platform\);/);

        const processStart = html.indexOf('const processAndStoreSoapData =');
        const processEnd = html.indexOf('const completeGeneratedSoapNote =', processStart);
        assert.notEqual(processStart, -1);
        const processBody = html.slice(processStart, processEnd);
        assert.ok(processBody.indexOf('captureSoapPlatformSnapshot(appointment, client)') < processBody.indexOf("['s', 'o', 'a', 'p'].forEach"));
    });
}
