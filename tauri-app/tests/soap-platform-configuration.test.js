import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

for (const path of ['index.html', 'src/index.html']) {
    test(`${path} supports configurable SOAP platforms and section order`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');

        assert.match(html, /id="openSoapConfigurationBtn"/);
        assert.match(html, /id="soapConfigurationModal"/);
        assert.match(html, /id="soapPlatformSectionsList"/);
        assert.match(html, /id="clientSoapPlatformSelect"/);
        assert.match(html, /const SOAP_PLATFORM_SECTION_DEFS =/);
        assert.match(html, /const getDefaultSoapPlatforms =/);
        assert.match(html, /const normalizeSoapPlatforms =/);
        assert.match(html, /const getClientSoapPlatform =/);
        assert.match(html, /row\.draggable = true/);
        assert.match(html, /row\.addEventListener\('dragstart'/);
        assert.match(html, /row\.addEventListener\('drop'/);
        assert.match(html, /const getSoapPlatformSectionKeys =/);
        assert.match(html, /const getSoapPlatformSectionKeysForAppointment =/);
        assert.match(html, /appointment\.soapPlatformSnapshot/);
        assert.match(html, /captureSoapPlatformSnapshot\(appointment, client\)/);
        assert.match(html, /soapContentEl\.replaceChildren\(/);
        assert.match(html, /configuredSoapSections\.map\(sectionKey => soapSectionsByKey\.get\(sectionKey\)/);
    });

    test(`${path} requires a client platform before SOAP generation`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');

        assert.match(html, /const generateSoapNote = async \(\) =>/);
        assert.match(html, /const client = findClient\(selectedClientId\);/);
        assert.match(html, /if \(!getClientSoapPlatform\(client\)\)/);
        assert.match(html, /Assign this client to a SOAP platform in Instructions before generating a SOAP note\./);
        assert.match(html, /renderClientSoapPlatformOptions\(client\?\.soapPlatformId \|\| ''\)/);
        assert.match(html, /client\.soapPlatformId = getSoapPlatformById\(clientSoapPlatformSelect\.value\)\?\.id \|\| ''/);
    });

    test(`${path} generates only configured post-Objective fields`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');

        assert.match(html, /const requestedSupportFields = \['presentingProblem', 'diagnosticSupport', 'medicalNecessity'\]/);
        assert.match(html, /fetchSupportFieldsFromAI\(client, appointment, requestedSupportFields\)/);
        assert.match(html, /const interventionsEnabled = isSoapPlatformSectionEnabled\(client, 'interventions'\)/);
        assert.match(html, /const fetchSupportFieldsFromAI = async \(client, appointment, requestedFields/);
        assert.match(html, /Do not write or return fields that were not requested/);
    });
}
