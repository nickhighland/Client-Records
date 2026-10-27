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
        assert.match(html, /id="preferredPronounsSelect"/);
        assert.match(html, /id="clientSessionTypeSelect"/);
        assert.match(html, /const SOAP_PLATFORM_SECTION_DEFS =/);
        assert.match(html, /const getDefaultSoapPlatforms =/);
        assert.match(html, /const normalizeSoapPlatforms =/);
        assert.match(html, /const getClientSoapPlatform =/);
        assert.match(html, /const hasAssignedClientPreferredPronouns =/);
        assert.match(html, /const hasAssignedClientSessionType =/);
        assert.match(html, /const getMissingSoapClientRequirements =/);
        assert.match(html, /client\.sessionTypeAssigned = normalizedSessionType === 'couple'/);
        assert.match(html, /row\.draggable = true/);
        assert.match(html, /row\.addEventListener\('dragstart'/);
        assert.match(html, /row\.addEventListener\('drop'/);
        assert.match(html, /const getSoapPlatformSectionKeys =/);
        assert.match(html, /const getSoapPlatformSectionKeysForAppointment =/);
        assert.match(html, /appointment\.soapPlatformSnapshot/);
        assert.match(html, /captureSoapPlatformSnapshot\(appointment, client\)/);
        assert.match(html, /const reorderSoapPlatformSections =/);
        assert.match(html, /row\.addEventListener\('pointerdown'/);
        assert.match(html, /row\.addEventListener\('pointermove'/);
        assert.match(html, /row\.addEventListener\('pointerup'/);
        assert.match(html, /soapContentEl\.replaceChildren\(/);
        assert.match(html, /configuredSoapSections\.map\(sectionKey => soapSectionsByKey\.get\(sectionKey\)/);
    });

    test(`${path} requires a client platform before SOAP generation`, async () => {
        const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');

        assert.match(html, /const generateSoapNote = async \(\) =>/);
        assert.match(html, /const client = findClient\(selectedClientId\);/);
        assert.match(html, /const missingSoapRequirements = getMissingSoapClientRequirements\(client\);/);
        assert.match(html, /getSoapGenerationRequirementMessage\(missingSoapRequirements\)/);
        assert.match(html, /Before generating a SOAP note, assign this client/);
        assert.match(html, /renderClientSoapPlatformOptions\(client\?\.soapPlatformId \|\| ''\)/);
        assert.match(html, /client\.soapPlatformId = getSoapPlatformById\(clientSoapPlatformSelect\.value\)\?\.id \|\| ''/);
        assert.match(html, /client\.sessionTypeAssigned = clientSessionTypeSelect\.value === 'individual' \|\| clientSessionTypeSelect\.value === 'couple'/);
        assert.match(html, /clientSessionTypeSelect\.value = hasAssignedClientSessionType\(client\) \? getClientSessionType\(client\) : ''/);
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
