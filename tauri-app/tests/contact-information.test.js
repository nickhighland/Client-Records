import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

for (const path of ['index.html', 'src/index.html']) {
    test(`${path} edits contact details in Client Information and preserves legacy contact records`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');

        assert.match(html, /id="clientInformationModal"/);
        assert.match(html, /id="clientPhoneNumberInput"/);
        assert.match(html, /id="clientEmailInput"/);
        assert.match(html, /const formatClientPhoneInput =/);
        assert.match(html, /replace\(\/\\D\/g, ''\)/);
        assert.match(html, /slice\(0, 10\)/);
        assert.match(html, /const CLIENT_EMAIL_PATTERN = \/\^\[\^\\s@\]\+@\[\^\\s@\]\+\\\.\[\^\\s@\]\+\$\//);
        assert.match(html, /clientInformationVersion: 1/);
        assert.match(html, /const syncLegacyPrimaryContactValue =/);
        assert.match(html, /if \(enteredPhone !== originalPhone\) syncLegacyPrimaryContactValue\(client, 'phones', phoneNumber\)/);
        assert.match(html, /if \(enteredEmail !== originalEmail\) syncLegacyPrimaryContactValue\(client, 'emails', client\.email\)/);
        assert.doesNotMatch(html, /id="contactTabBtn"/);
        assert.doesNotMatch(html, /id="contactContent"/);
        assert.doesNotMatch(html, /id="clientPhoneList"/);
        assert.doesNotMatch(html, /id="clientEmailList"/);
    });
}
