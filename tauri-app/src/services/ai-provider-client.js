export const extractJsonObject = (rawText) => {
    if (typeof rawText === 'object' && rawText !== null) {
        return rawText;
    }
    const text = String(rawText || '').trim();
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
        throw new Error('AI did not return a valid JSON object.');
    }
    const jsonText = text.slice(firstBrace, lastBrace + 1);
    return JSON.parse(jsonText);
};

export const createAiProviderClient = ({
    getConfig,
    fetchImpl,
    getGoogleAccessToken,
    requestVertexGenerateContent,
    rememberVertexEffectiveLocation,
    HeadersImpl = globalThis.Headers
}) => {
    const requestJsonObjectFromCurrentProvider = async (systemPrompt, userPrompt) => {
        const config = getConfig();
        const {
            apiProvider,
            selectedModel,
            vertexServiceAccount,
            vertexLocation,
            openaiApiKey,
            serverAddress,
            apiKey,
            ollamaAddress
        } = config;

        if (!selectedModel) {
            throw new Error('Please connect to a provider and select a model in Settings.');
        }

        if (apiProvider === 'vertex') {
            if (!vertexServiceAccount || !vertexLocation) throw new Error('Please connect Vertex in Settings first.');

            const accessToken = await getGoogleAccessToken(vertexServiceAccount);
            const credentials = JSON.parse(vertexServiceAccount);
            const projectId = credentials.project_id;
            const payload = {
                contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
                generationConfig: { responseMimeType: 'application/json' }
            };
            const request = await requestVertexGenerateContent({
                accessToken,
                location: vertexLocation,
                modelId: selectedModel,
                payload,
                projectId
            });
            rememberVertexEffectiveLocation(request.location);
            const result = await request.response.json();
            const content = result?.candidates?.[0]?.content?.parts?.[0]?.text;
            return extractJsonObject(content);
        }

        if (apiProvider === 'openai') {
            if (!openaiApiKey) throw new Error('Please connect OpenAI in Settings first.');
            const payload = {
                model: selectedModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: 'json_object' }
            };
            const response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiApiKey}`
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`OpenAI API error: ${response.status} - ${errorData?.error?.message || 'Unknown error'}`);
            }
            const result = await response.json();
            return extractJsonObject(result?.choices?.[0]?.message?.content);
        }

        if (apiProvider === 'openwebui') {
            if (!serverAddress) throw new Error('Please connect Open WebUI in Settings first.');
            const payload = {
                model: selectedModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: 'json_object' },
                stream: false
            };
            const headers = new HeadersImpl({ 'Content-Type': 'application/json' });
            if (apiKey) headers.append('Authorization', `Bearer ${apiKey}`);
            const response = await fetchImpl(`${serverAddress}/api/v1/chat/completions`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                mode: 'cors'
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Open WebUI API error: ${response.status} - ${errorText}`);
            }
            const result = await response.json();
            return extractJsonObject(result?.choices?.[0]?.message?.content);
        }

        if (apiProvider === 'ollama') {
            const address = String(ollamaAddress || '').trim();
            if (!address) throw new Error('Please connect Ollama in Settings first.');
            const base = address.endsWith('/') ? address.slice(0, -1) : address;
            const payload = {
                model: selectedModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: 'json_object' },
                stream: false
            };
            const response = await fetchImpl(`${base}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
            }
            const result = await response.json();
            return extractJsonObject(result?.choices?.[0]?.message?.content);
        }

        throw new Error('Invalid API provider selected.');
    };

    return { requestJsonObjectFromCurrentProvider };
};
