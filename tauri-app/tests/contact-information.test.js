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
        assert.match(html, /const CONTACT_ICON_SVGS =/);
        assert.match(html, /grid-template-columns: auto minmax\(0, 1fr\) auto auto;/);
        assert.match(html, /className = 'client-contact-icon-btn client-contact-copy-btn'/);
        assert.match(html, /className = locked\s*\?\s*'client-contact-icon-btn client-contact-edit-btn'\s*:\s*'client-contact-icon-btn client-contact-lock-btn'/);
        assert.match(html, /innerHTML = locked \? CONTACT_ICON_SVGS\.edit : CONTACT_ICON_SVGS\.check/);
        assert.match(html, /className = 'client-contact-icon-btn client-contact-remove-btn'/);
        assert.match(html, /row\.appendChild\(editLockBtn\);[\s\S]*row\.appendChild\(input\);[\s\S]*row\.appendChild\(removeBtn\);[\s\S]*row\.appendChild\(copyBtn\);/);
        assert.doesNotMatch(html, /const editBtn = document\.createElement\('button'\)/);
        assert.doesNotMatch(html, /const lockBtn = document\.createElement\('button'\)/);
        assert.doesNotMatch(html, /client-contact-lock-checkbox/);
        assert.match(html, /contactInfo\[listKey\]\.push\(\{ value: '', locked: false \}\);/);
        assert.match(html, /const setClientContactLock =/);
        assert.match(html, /const copyClientContactEntry = async/);
        assert.match(html, /void copyClientContactEntry\(type, index, copyBtn\)/);
        assert.match(html, /if \(validationMessage\) \{/);
        assert.match(html, /const value = type === 'phones'[\s\S]*?formatClientPhoneInput\(e\.target\.value\)/);
    });
}
