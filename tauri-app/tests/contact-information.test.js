import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

for (const path of ['index.html', 'src/index.html']) {
    test(`${path} preserves existing contacts and protects future contact edits`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');

        assert.match(html, /value: String\(rawValue \?\? ''\),\s*locked: entry\.locked !== false/);
        assert.match(html, /value: String\(entry \?\? ''\),\s*locked: true/);
        assert.match(html, /const formatClientPhoneInput =/);
        assert.match(html, /replace\(\/\\D\/g, ''\)/);
        assert.match(html, /slice\(0, 10\)/);
        assert.match(html, /const CLIENT_EMAIL_PATTERN = \/\^\[\^\\s@\]\+@\[\^\\s@\]\+\\\.\[\^\\s@\]\+\$\//);
        assert.match(html, /className = 'client-contact-lock-checkbox'/);
        assert.match(html, /className = 'btn client-contact-edit-btn'/);
        assert.match(html, /className = 'btn client-contact-remove-btn'/);
        assert.match(html, /contactInfo\[listKey\]\.push\(\{ value: '', locked: false \}\);/);
        assert.match(html, /const setClientContactLock =/);
        assert.match(html, /if \(validationMessage\) \{/);
        assert.match(html, /const value = type === 'phones'[\s\S]*?formatClientPhoneInput\(e\.target\.value\)/);
    });
}
