export const createSoapProviderController = ({
    getProviderState,
    findClient,
    findAppointment,
    hasAppointmentGenerationInput,
    getTreatmentGoalsContext,
    getCandidateObjectivesContext,
    getInterventionContext,
    getInterventionBankContext,
    getSelectedInterventionContext,
    getClientSoapModalityContext,
    getInstructionsContext,
    getSoapAuditProofingContext,
    tauriFetch,
    completeGeneratedSoapNote,
    updateGenerateNoteButtonState,
    getGoogleAccessToken,
    buildVertexCachedSoapPayload,
    buildVertexDirectSoapPayload,
    buildVertexSoapCacheMaterial,
    getOrCreateVertexSoapContextCache,
    invalidateVertexContextCache,
    rememberVertexEffectiveLocation,
    requestVertexGenerateContent
}) => {
const generateSoapNoteWithOpenAI = async () => {
    const { selectedModel, openaiApiKey, selectedClientId, selectedAppointmentId, systemPrompt } = getProviderState();
    if (!selectedModel || !openaiApiKey) {
        alert('Please connect to OpenAI with an API key and model first.');
        return;
    }

    const client = findClient(selectedClientId);
    const appointment = findAppointment(client, selectedAppointmentId);
    if (!client || !appointment || !hasAppointmentGenerationInput(appointment)) {
        alert('Please select a client and appointment, and enter session information and/or audit-proofing details.');
        return;
    }

    const treatmentGoalsContext = getTreatmentGoalsContext(client);
    const candidateObjectivesContext = getCandidateObjectivesContext(client);
    const interventionContext = getInterventionContext(appointment, client);
    const modalityLensContext = getClientSoapModalityContext(client, appointment);
    const appointmentSessionInfo = appointment.sessionInfo || '';
    const instructionsContext = getInstructionsContext(client, appointment);
    const auditProofingContext = getSoapAuditProofingContext(appointment);

    const userPrompt = `- **Session Information (This Session):**\n${appointmentSessionInfo}${treatmentGoalsContext}${candidateObjectivesContext}${interventionContext}${auditProofingContext}${modalityLensContext}${instructionsContext}`;

    const payload = {
        model: selectedModel,
        messages: [
            { "role": "system", "content": systemPrompt },
            { "role": "user", "content": userPrompt }
        ],
        response_format: { "type": "json_object" }
    };

    try {
        const response = await tauriFetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiApiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`OpenAI API error: ${response.status} - ${errorData.error.message}`);
        }

        const result = await response.json();
        if (!result || !result.choices || !result.choices[0].message.content) {
            throw new Error("The OpenAI API returned an invalid or empty response.");
        }

        let content = result.choices[0].message.content;
        let soapData = JSON.parse(content);

        await completeGeneratedSoapNote(soapData, appointment, client);

    } catch (error) {
        console.error('OpenAI SOAP Note Generation Error:', error);
        alert(`Failed to generate SOAP note with OpenAI. Please check your API Key, Model Name, and the console for details.\nError: ${error.message}`);
    } finally {
        updateGenerateNoteButtonState();
    }
};

const generateSoapNoteWithVertex = async () => {
    const { selectedModel, vertexServiceAccount, vertexLocation, selectedClientId, selectedAppointmentId, systemPrompt } = getProviderState();
    if (!selectedModel || !vertexServiceAccount || !vertexLocation) {
        alert('Please connect to Vertex AI with Service Account JSON and location first.');
        return;
    }

    const client = findClient(selectedClientId);
    const appointment = findAppointment(client, selectedAppointmentId);
    if (!client || !appointment || !hasAppointmentGenerationInput(appointment)) {
        alert('Please select a client and appointment, and enter session information and/or audit-proofing details.');
        return;
    }

    const treatmentGoalsContext = getTreatmentGoalsContext(client);
    const candidateObjectivesContext = getCandidateObjectivesContext(client);
    const interventionBankContext = getInterventionBankContext(client);
    const selectedInterventionContext = getSelectedInterventionContext(appointment, client);
    const modalityLensContext = getClientSoapModalityContext(client, appointment);
    const appointmentSessionInfo = appointment.sessionInfo || '';
    const instructionsContext = getInstructionsContext(client, appointment);
    const auditProofingContext = getSoapAuditProofingContext(appointment);

    const userPrompt = `
- **Session Information (This Session):**
${appointmentSessionInfo}${treatmentGoalsContext}${candidateObjectivesContext}${selectedInterventionContext}${auditProofingContext}${modalityLensContext}${instructionsContext}
`;

    try {
        const accessToken = await getGoogleAccessToken(vertexServiceAccount);
        const credentials = JSON.parse(vertexServiceAccount);
        const projectId = credentials.project_id;

        const cacheMaterial = buildVertexSoapCacheMaterial({
            systemPrompt,
            interventionBankContext
        });
        let cacheResult = null;
        try {
            cacheResult = await getOrCreateVertexSoapContextCache({
                accessToken,
                cacheMaterial,
                fetchImpl: tauriFetch,
                location: vertexLocation,
                modelId: selectedModel,
                projectId,
                storage: localStorage
            });
            rememberVertexEffectiveLocation(cacheResult.location);
        } catch (cacheError) {
            console.warn('Vertex explicit context cache unavailable; using implicit caching.', cacheError);
        }

        const requestVertexSoap = payload => requestVertexGenerateContent({
            accessToken,
            allowErrorStatuses: [400, 404],
            location: vertexLocation,
            modelId: selectedModel,
            payload,
            projectId
        });
        const directPayload = buildVertexDirectSoapPayload({
            systemPrompt,
            interventionBankContext,
            userPrompt
        });
        let soapRequest = await requestVertexSoap(cacheResult?.cacheName
            ? buildVertexCachedSoapPayload({
                cacheName: cacheResult.cacheName,
                userPrompt
            })
            : directPayload);
        rememberVertexEffectiveLocation(soapRequest.location);
        let response = soapRequest.response;

        if (!response.ok && cacheResult?.cacheName && [400, 404].includes(response.status)) {
            invalidateVertexContextCache({
                storage: localStorage,
                storageKey: cacheResult.storageKey
            });
            console.warn('Vertex context cache expired or was rejected; retrying without explicit caching.');
            soapRequest = await requestVertexSoap(directPayload);
            rememberVertexEffectiveLocation(soapRequest.location);
            response = soapRequest.response;
        }

        if (!response.ok) {
            throw soapRequest.error || new Error(`Vertex API error: ${response.status}`);
        }

        const result = await response.json();
        const cachedTokens = Number(result?.usageMetadata?.cachedContentTokenCount || 0);
        if (cachedTokens > 0) {
            console.info(`Vertex reused ${cachedTokens} cached SOAP context tokens.`);
        }

        if (!result || !result.candidates || !result.candidates[0]?.content?.parts?.[0]?.text) {
            throw new Error('The Vertex API returned an invalid or empty response.');
        }

        const content = result.candidates[0].content.parts[0].text;
        const soapData = JSON.parse(content);

        await completeGeneratedSoapNote(soapData, appointment, client);

    } catch (error) {
        console.error('Vertex SOAP Note Generation Error:', error);
        alert(`Failed to generate SOAP note with Vertex AI. Check your Service Account JSON, location, model, and network connection.\nError: ${error.message}`);
    } finally {
        updateGenerateNoteButtonState();
    }
};

const generateSoapNoteWithOpenWebUI = async () => {
    const { selectedModel, selectedClientId, selectedAppointmentId, systemPrompt, apiKey, serverAddress } = getProviderState();
    if (!selectedModel) {
        alert('Please connect to your server and select a model first.');
        return;
    }

    const client = findClient(selectedClientId);
    const appointment = findAppointment(client, selectedAppointmentId);
    if (!client || !appointment || !hasAppointmentGenerationInput(appointment)) {
        alert('Please select a client and appointment, and enter session information and/or audit-proofing details.');
        return;
    }

    const treatmentGoalsContext = getTreatmentGoalsContext(client);
    const candidateObjectivesContext = getCandidateObjectivesContext(client);
    const interventionContext = getInterventionContext(appointment, client);
    const modalityLensContext = getClientSoapModalityContext(client, appointment);
    const appointmentSessionInfo = appointment.sessionInfo || '';
    const instructionsContext = getInstructionsContext(client, appointment);
    const auditProofingContext = getSoapAuditProofingContext(appointment);

    const userPrompt = `
- **Client Name:** ${client.name}
- **Session Information (This Session):**
${appointmentSessionInfo}${treatmentGoalsContext}${candidateObjectivesContext}${interventionContext}${auditProofingContext}${modalityLensContext}${instructionsContext}`;

    const payload = {
        model: selectedModel,
        messages: [
            { "role": "system", "content": systemPrompt },
            { "role": "user", "content": userPrompt }
        ],
        response_format: { "type": "json_object" },
        stream: false
    };
    
    try {
        const headers = new Headers({ 'Content-Type': 'application/json' });
         if (apiKey) {
             headers.append('Authorization', `Bearer ${apiKey}`);
        }
        const response = await tauriFetch(`${serverAddress}/api/v1/chat/completions`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload),
            mode: 'cors'
        });

        if (!response.ok) {
            const errorText = await response.text();
            const error = new Error(`API error: ${response.status} - ${errorText}`);
            error.response = response;
            throw error;
        }

        const result = await response.json();
        if (!result) {
            throw new Error("The API returned an empty response. Please check the Open WebUI server logs for errors.");
        }
        let content = result.choices[0].message.content;
        let soapData = {};

        // Aggressive JSON extraction and cleanup
        try {
            // Find the first '{' and the last '}' to extract the JSON part.
            const firstBrace = content.indexOf('{');
            const lastBrace = content.lastIndexOf('}');
            if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
                throw new Error('AI response did not contain a valid JSON object.');
            }
            let jsonString = content.substring(firstBrace, lastBrace + 1);
            
            // Attempt to parse it. If it fails, it's likely due to malformed content.
            try {
                soapData = JSON.parse(jsonString);
            } catch (e) {
                console.warn("Initial JSON.parse failed. Attempting to clean and re-parse.", e.message);
                // This is a more robust fallback for models that fail to escape content correctly.
                // It performs multiple passes to clean up common issues.
                
                // 1. Remove newlines within JSON strings, which is a common error.
                let cleanedString = jsonString.replace(/:\s*"(.*?)"/gs, (match, group1) => {
                    const singleLineGroup = group1.replace(/\n/g, '\\n').replace(/\r/g, '');
                    return `: "${singleLineGroup}"`;
                });

                // 2. Fix unescaped quotes inside values. This is more complex.
                // We look for a quote that is not preceded by a backslash.
                cleanedString = cleanedString.replace(/:\s*"(.*?)"/g, (match, group1) => {
                    const fixedGroup = group1.replace(/(?<!\\)"/g, '\\"');
                    return `: "${fixedGroup}"`;
                });

                soapData = JSON.parse(cleanedString); // Retry parsing with the cleaned string
            }

        } catch (parseError) {
            console.error("Failed to parse the following JSON string from the AI:", content);
            throw new Error(`The AI model returned malformed JSON that could not be automatically fixed. Check the browser console for the raw output. Details: ${parseError.message}`);
        }
        
        await completeGeneratedSoapNote(soapData, appointment, client);

    } catch (error) {
        console.error('SOAP Note Generation Error:', error);
        let alertMessage = `Failed to generate SOAP note. Please check your connection and the console for details.\nError: ${error.message}`;
        
        if (error.response?.status === 401) {
             alertMessage = `Authentication failed (401 Unauthorized) while trying to generate the note. Please re-check your API Key.`;
        } else if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
            alertMessage = `Network Error: Failed to fetch. Check CORS policy on your server.`;
        }
        alert(alertMessage);
    } finally {
        updateGenerateNoteButtonState();
    }
};

const generateSoapNoteWithOllama = async () => {
    const { selectedModel, selectedClientId, selectedAppointmentId, systemPrompt, ollamaAddress } = getProviderState();
    if (!selectedModel) {
        alert('Please connect to Ollama and select a model first.');
        return;
    }

    const client = findClient(selectedClientId);
    const appointment = findAppointment(client, selectedAppointmentId);
    if (!client || !appointment || !hasAppointmentGenerationInput(appointment)) {
        alert('Please select a client and appointment, and enter session information and/or audit-proofing details.');
        return;
    }

    const address = (ollamaAddress || '').trim();
    if (!address) {
        alert('Please enter your Ollama address in Settings and connect first.');
        return;
    }
    const base = address.endsWith('/') ? address.slice(0, -1) : address;

    const treatmentGoalsContext = getTreatmentGoalsContext(client);
    const candidateObjectivesContext = getCandidateObjectivesContext(client);
    const interventionContext = getInterventionContext(appointment, client);
    const modalityLensContext = getClientSoapModalityContext(client, appointment);
    const appointmentSessionInfo = appointment.sessionInfo || '';
    const instructionsContext = getInstructionsContext(client, appointment);
    const auditProofingContext = getSoapAuditProofingContext(appointment);

    const userPrompt = `
- **Client Name:** ${client.name}
- **Session Information (This Session):**
${appointmentSessionInfo}${treatmentGoalsContext}${candidateObjectivesContext}${interventionContext}${auditProofingContext}${modalityLensContext}${instructionsContext}`;

    const payload = {
        model: selectedModel,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        stream: false
    };

    try {
        const response = await tauriFetch(`${base}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            const error = new Error(`Ollama API error: ${response.status} - ${errorText}`);
            error.response = response;
            throw error;
        }

        const result = await response.json();
        if (!result) {
            throw new Error('The Ollama API returned an empty response. Please check the Ollama server logs for errors.');
        }
        let content = result.choices[0].message.content;
        let soapData = {};

        try {
            const firstBrace = content.indexOf('{');
            const lastBrace = content.lastIndexOf('}');
            if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
                throw new Error('AI response did not contain a valid JSON object.');
            }
            let jsonString = content.substring(firstBrace, lastBrace + 1);

            try {
                soapData = JSON.parse(jsonString);
            } catch (e) {
                console.warn('Initial JSON.parse failed for Ollama. Attempting to clean and re-parse.', e.message);
                let cleanedString = jsonString.replace(/:\s*"(.*?)"/gs, (match, group1) => {
                    const singleLineGroup = group1.replace(/\n/g, '\\n').replace(/\r/g, '');
                    return `: "${singleLineGroup}"`;
                });
                cleanedString = cleanedString.replace(/:\s*"(.*?)"/g, (match, group1) => {
                    const fixedGroup = group1.replace(/(?<!\\)"/g, '\\"');
                    return `: "${fixedGroup}"`;
                });

                soapData = JSON.parse(cleanedString);
            }
        } catch (parseError) {
            console.error('Failed to parse the following JSON string from Ollama:', content);
            throw new Error(`The AI model returned malformed JSON that could not be automatically fixed. Check the console for the raw output. Details: ${parseError.message}`);
        }

        await completeGeneratedSoapNote(soapData, appointment, client);

    } catch (error) {
        console.error('SOAP Note Generation Error (Ollama):', error);
        let alertMessage = `Failed to generate SOAP note with Ollama. Please check your connection and the console for details.\nError: ${error.message}`;
        if (error.response?.status === 401) {
            alertMessage = 'Authentication failed (401 Unauthorized) while trying to generate the note via Ollama.';
        } else if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
            alertMessage = 'Network Error: Failed to fetch from Ollama. Ensure the Ollama server is running and accessible.';
        }
        alert(alertMessage);
    } finally {
        updateGenerateNoteButtonState();
    }
};

return {
    generateSoapNoteWithOpenAI,
    generateSoapNoteWithVertex,
    generateSoapNoteWithOpenWebUI,
    generateSoapNoteWithOllama
};
};
