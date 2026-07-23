const EXCLUDED_GEMINI_MODEL_MARKERS = [
    'audio',
    'computer-use',
    'embedding',
    'image',
    'live',
    'native-audio',
    'omni',
    'robotics',
    'speech',
    'tts'
];

const getModelId = (resourceName) => {
    const finalSegment = String(resourceName || '').split('/').pop() || '';
    return finalSegment.replace(/@[^@/]+$/, '').trim();
};

const getModelCategory = (model, modelId) => {
    const launchStage = String(model?.launchStage || '').toUpperCase();
    const versionState = String(model?.versionState || '').toUpperCase();
    const normalizedId = modelId.toLowerCase();
    const isPreview = launchStage === 'PUBLIC_PREVIEW'
        || launchStage === 'EXPERIMENTAL'
        || versionState === 'VERSION_STATE_UNSTABLE'
        || normalizedId.includes('preview')
        || normalizedId.includes('-exp');

    return isPreview ? 'preview' : 'stable';
};

const isCompatibleGeminiTextModel = (model, modelId) => {
    const normalizedId = modelId.toLowerCase();
    const launchStage = String(model?.launchStage || '').toUpperCase();

    if (!normalizedId.startsWith('gemini-') || launchStage === 'PRIVATE_PREVIEW') {
        return false;
    }

    return !EXCLUDED_GEMINI_MODEL_MARKERS.some(marker => normalizedId.includes(marker));
};

const compareModels = (left, right) => {
    if (left.category !== right.category) {
        return left.category === 'stable' ? -1 : 1;
    }

    return right.id.localeCompare(left.id, undefined, {
        numeric: true,
        sensitivity: 'base'
    });
};

export const getVertexApiHost = (location) => {
    const normalizedLocation = String(location || '').trim().toLowerCase();
    return normalizedLocation === 'global'
        ? 'aiplatform.googleapis.com'
        : `${normalizedLocation}-aiplatform.googleapis.com`;
};

export const normalizeVertexPublisherModels = (publisherModels) => {
    const uniqueModels = new Map();

    for (const model of Array.isArray(publisherModels) ? publisherModels : []) {
        const id = getModelId(model?.name);
        if (!isCompatibleGeminiTextModel(model, id)) {
            continue;
        }

        const normalizedModel = {
            id,
            category: getModelCategory(model, id),
            launchStage: String(model?.launchStage || ''),
            versionState: String(model?.versionState || '')
        };
        const existing = uniqueModels.get(id);

        if (!existing || (existing.category === 'preview' && normalizedModel.category === 'stable')) {
            uniqueModels.set(id, normalizedModel);
        }
    }

    return [...uniqueModels.values()].sort(compareModels);
};

const getResponseError = async (response) => {
    const responseText = await response.text();
    try {
        const errorData = JSON.parse(responseText);
        return errorData?.error?.message || responseText;
    } catch (_) {
        return responseText;
    }
};

export const fetchVertexGeminiModelCatalog = async ({
    accessToken,
    fetchImpl,
    location
}) => {
    if (!accessToken) {
        throw new Error('A Google access token is required to refresh Vertex models.');
    }
    if (typeof fetchImpl !== 'function') {
        throw new Error('A fetch implementation is required to refresh Vertex models.');
    }

    const host = getVertexApiHost(location);
    const publisherModels = [];
    let pageToken = '';
    let pageCount = 0;

    do {
        const url = new URL(`https://${host}/v1beta1/publishers/google/models`);
        url.searchParams.set('pageSize', '100');
        url.searchParams.set('listAllVersions', 'false');
        if (pageToken) {
            url.searchParams.set('pageToken', pageToken);
        }

        const response = await fetchImpl(url.toString(), {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) {
            const details = await getResponseError(response);
            throw new Error(`Vertex model refresh failed (${response.status}): ${details || response.statusText}`);
        }

        const result = await response.json();
        if (!Array.isArray(result?.publisherModels)) {
            throw new Error('Vertex returned an unexpected model catalog response.');
        }

        publisherModels.push(...result.publisherModels);
        pageToken = String(result.nextPageToken || '');
        pageCount += 1;

        if (pageCount > 100) {
            throw new Error('Vertex returned too many model catalog pages.');
        }
    } while (pageToken);

    const models = normalizeVertexPublisherModels(publisherModels);
    if (models.length === 0) {
        throw new Error('Vertex returned no compatible Gemini text-generation models.');
    }

    return models;
};

export const choosePreferredVertexModel = (models) => {
    const availableModels = Array.isArray(models) ? models : [];
    return availableModels.find(model => model.category === 'stable'
        && model.id.includes('flash')
        && !model.id.includes('flash-lite'))
        || availableModels.find(model => model.category === 'stable')
        || availableModels[0]
        || null;
};
