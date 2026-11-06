// Deterministic Objective topic clustering and SOAP section ordering.

export const normalizeObjectiveOrderingItem = value => normalizeInterventionText(String(value || '').replace(/^•\s*/, '').trim());

export const normalizeInterventionText = (text) => (text || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const stemInterventionToken = (token) => {
    let t = String(token || '').toLowerCase().trim();
    if (!t) return '';
    if (t.length > 7 && t.endsWith('ization')) t = t.slice(0, -5);
    else if (t.length > 6 && t.endsWith('ation')) t = t.slice(0, -5);
    else if (t.length > 5 && t.endsWith('ing')) t = t.slice(0, -3);
    else if (t.length > 4 && t.endsWith('ed')) t = t.slice(0, -2);
    else if (t.length > 4 && t.endsWith('es')) t = t.slice(0, -2);
    else if (t.length > 3 && t.endsWith('s')) t = t.slice(0, -1);
    if (t.length > 5 && t.endsWith('e')) t = t.slice(0, -1);
    return t;
};

export const tokenizeForInterventionMatch = (value) => normalizeInterventionText(value)
    .split(' ')
    .map(stemInterventionToken)
    .filter(Boolean);

export const soapTopicStopWords = new Set([
    'and', 'or', 'the', 'with', 'for', 'to', 'of', 'in', 'on', 'a', 'an', 'by',
    'writer', 'client', 'ct', 'session', 'during', 'through', 'from', 'that', 'this',
    'were', 'was', 'are', 'is', 'be', 'been', 'it', 'as', 'at', 'into', 'within',
    'not', 'no', 'yes', 'per', 'then', 'than', 'also', 'about', 'related'
]);

export const soapTopicWeakAnchorTokens = new Set([
    'coping', 'skill', 'technique', 'treatment', 'therapeutic', 'manage',
    'management', 'progress', 'support', 'response', 'discuss', 'explore',
    'practice', 'practic', 'address', 'identify', 'strategi', 'strategy'
]);

export const splitSoapBulletItems = (value) => String(value || '')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => line.replace(/^•\s*/, '').trim())
    .filter(Boolean);

export const joinSoapBulletItems = (items) => (items || [])
    .map(item => String(item || '').replace(/^•\s*/, '').trim())
    .filter(Boolean)
    .map(item => `• ${item}`)
    .join('\n');

export const normalizeObjectiveLine = (line) => String(line || '').replace(/^•\s*/, '').trim();

export const normalizeObjectiveSection = (sectionText) => {
    const objectiveItems = splitSoapBulletItems(sectionText);
    if (objectiveItems.length === 0) return sectionText || '';
    return joinSoapBulletItems(objectiveItems.map(normalizeObjectiveLine));
};

export const normalizeObjectiveSuggestions = (suggestions) => {
    if (!Array.isArray(suggestions)) return [];
    return suggestions.map(suggestion => {
        if (typeof suggestion === 'string') {
            return normalizeObjectiveLine(suggestion);
        }
        if (suggestion && typeof suggestion === 'object') {
            const normalizedSuggestion = { ...suggestion };
            if (normalizedSuggestion.original) {
                normalizedSuggestion.original = normalizeObjectiveLine(normalizedSuggestion.original);
            }
            if (normalizedSuggestion.suggested) {
                normalizedSuggestion.suggested = normalizeObjectiveLine(normalizedSuggestion.suggested);
            }
            return normalizedSuggestion;
        }
        return suggestion;
    });
};

export const tokenizeForSoapTopic = (value) => normalizeInterventionText(value)
    .split(' ')
    .map(stemInterventionToken)
    .filter(token => token.length > 2 && !soapTopicStopWords.has(token));

export const getTopicTextFromSuggestion = (suggestion) => {
    if (typeof suggestion === 'string') return suggestion;
    if (suggestion && typeof suggestion === 'object') {
        return [suggestion.suggested, suggestion.original].filter(Boolean).join(' ');
    }
    return '';
};

export const scoreTopicOverlap = (tokenSet, topicTokenSet) => {
    if (!tokenSet || !topicTokenSet || tokenSet.size === 0 || topicTokenSet.size === 0) return { overlap: 0, score: 0 };
    const overlap = [...tokenSet].filter(token => topicTokenSet.has(token)).length;
    if (overlap === 0) return { overlap: 0, score: 0 };
    const score = overlap / Math.min(tokenSet.size, topicTokenSet.size);
    return { overlap, score };
};

export const hasStrongSingleTopicAnchor = (tokenSet, topicTokenSet) => {
    if (!tokenSet || !topicTokenSet || tokenSet.size === 0 || topicTokenSet.size === 0) return false;
    const sharedTokens = [...tokenSet].filter(token => topicTokenSet.has(token));
    return sharedTokens.some(token => token.length >= 5 && !soapTopicWeakAnchorTokens.has(token));
};

export const buildObjectiveTopicClusters = (objectiveItems) => {
    const tokenSets = (objectiveItems || []).map(item => new Set(tokenizeForSoapTopic(item)));
    const parent = tokenSets.map((_, index) => index);

    const find = (index) => {
        if (parent[index] !== index) {
            parent[index] = find(parent[index]);
        }
        return parent[index];
    };

    const union = (left, right) => {
        const leftRoot = find(left);
        const rightRoot = find(right);
        if (leftRoot === rightRoot) return;
        parent[rightRoot] = leftRoot;
    };

    // Build topic clusters from pairwise similarity so grouping is not dependent on approval order.
    for (let i = 0; i < tokenSets.length; i += 1) {
        if (tokenSets[i].size === 0) continue;
        for (let j = i + 1; j < tokenSets.length; j += 1) {
            if (tokenSets[j].size === 0) continue;
            const { overlap, score } = scoreTopicOverlap(tokenSets[i], tokenSets[j]);
            const strongAnchorMatch = hasStrongSingleTopicAnchor(tokenSets[i], tokenSets[j]);
            if (overlap >= 2 || score >= 0.6 || strongAnchorMatch) {
                union(i, j);
            }
        }
    }

    const clusterMetaByRoot = new Map();
    tokenSets.forEach((tokens, index) => {
        if (tokens.size === 0) return;
        const root = find(index);
        if (!clusterMetaByRoot.has(root)) {
            clusterMetaByRoot.set(root, {
                firstIndex: index,
                tokens: new Set()
            });
        }
        const cluster = clusterMetaByRoot.get(root);
        cluster.firstIndex = Math.min(cluster.firstIndex, index);
        tokens.forEach(token => cluster.tokens.add(token));
    });

    const orderedRoots = [...clusterMetaByRoot.entries()]
        .sort((a, b) => a[1].firstIndex - b[1].firstIndex)
        .map(([root]) => root);
    const rootToTopicIndex = new Map(orderedRoots.map((root, topicIndex) => [root, topicIndex]));

    const topics = orderedRoots.map(root => ({
        tokens: new Set(clusterMetaByRoot.get(root).tokens)
    }));

    const assignments = tokenSets.map((tokens, index) => {
        if (tokens.size === 0) return Number.POSITIVE_INFINITY;
        const root = find(index);
        const topicIndex = rootToTopicIndex.get(root);
        return Number.isInteger(topicIndex) ? topicIndex : Number.POSITIVE_INFINITY;
    });

    return { topics, assignments };
};

export const getTopicRankForText = (text, topics) => {
    const tokens = new Set(tokenizeForSoapTopic(text));
    if (tokens.size === 0 || !Array.isArray(topics) || topics.length === 0) {
        return Number.POSITIVE_INFINITY;
    }

    let bestTopicIndex = -1;
    let bestOverlap = 0;
    let bestScore = 0;

    topics.forEach((topic, index) => {
        const { overlap, score } = scoreTopicOverlap(tokens, topic.tokens);
        if (score > bestScore || (score === bestScore && overlap > bestOverlap)) {
            bestTopicIndex = index;
            bestOverlap = overlap;
            bestScore = score;
        }
    });

    if (bestTopicIndex === -1) return Number.POSITIVE_INFINITY;
    const strongAnchorMatch = hasStrongSingleTopicAnchor(tokens, topics[bestTopicIndex].tokens);
    if (bestOverlap >= 2 || bestScore >= 0.4 || (bestOverlap >= 1 && strongAnchorMatch)) return bestTopicIndex;
    return Number.POSITIVE_INFINITY;
};

export const sortByTopicOrderStable = (items, getTopicText, topics) => (items || [])
    .map((item, originalIndex) => ({
        item,
        originalIndex,
        topicRank: getTopicRankForText(getTopicText(item), topics)
    }))
    .sort((a, b) => {
        if (a.topicRank === b.topicRank) return a.originalIndex - b.originalIndex;
        return a.topicRank - b.topicRank;
    })
    .map(entry => entry.item);

export const sortByExplicitTopicRanksStable = (items, explicitTopicRanks = []) => (items || [])
    .map((item, originalIndex) => {
        const explicitRank = explicitTopicRanks[originalIndex];
        return {
            item,
            originalIndex,
            topicRank: Number.isFinite(explicitRank) ? explicitRank : Number.POSITIVE_INFINITY
        };
    })
    .sort((a, b) => {
        if (a.topicRank === b.topicRank) return a.originalIndex - b.originalIndex;
        return a.topicRank - b.topicRank;
    })
    .map(entry => entry.item);

export const SOAP_SORT_SECTION_KEYS = ['o', 's', 'a', 'p'];

export const ensureSoapSectionOrderOverrides = (soap) => {
    if (!soap || typeof soap !== 'object') return { s: false, o: false, a: false, p: false };
    if (!soap.sectionOrderManualOverride || typeof soap.sectionOrderManualOverride !== 'object') {
        soap.sectionOrderManualOverride = {};
    }
    SOAP_SORT_SECTION_KEYS.forEach(key => {
        if (typeof soap.sectionOrderManualOverride[key] !== 'boolean') {
            soap.sectionOrderManualOverride[key] = false;
        }
    });
    return soap.sectionOrderManualOverride;
};

export const setSoapSectionOrderOverride = (soap, sectionKey, isOverridden = true) => {
    const overrides = ensureSoapSectionOrderOverrides(soap);
    if (Object.prototype.hasOwnProperty.call(overrides, sectionKey)) {
        overrides[sectionKey] = !!isOverridden;
    }
};

export const isSoapSectionOrderOverridden = (soap, sectionKey) => {
    const overrides = ensureSoapSectionOrderOverrides(soap);
    return !!overrides[sectionKey];
};

export const alignSoapSectionsByObjectiveOrder = (soap, options = {}) => {
    if (!soap || typeof soap !== 'object') return;
    const skipSections = options.skipSections instanceof Set
        ? options.skipSections
        : new Set(Array.isArray(options.skipSections) ? options.skipSections : []);

    const objectiveTextItems = splitSoapBulletItems(soap.o || '');
    const objectiveSuggestionItems = Array.isArray(soap.o_suggestion)
        ? soap.o_suggestion.map(getTopicTextFromSuggestion).filter(Boolean)
        : [];
    const objectiveSeedItems = [...objectiveTextItems, ...objectiveSuggestionItems];
    if (objectiveSeedItems.length === 0) return;

    const { topics, assignments } = buildObjectiveTopicClusters(objectiveSeedItems);
    if (topics.length === 0) return;

    const objectiveTextTopicRanks = assignments.slice(0, objectiveTextItems.length);
    const objectiveSuggestionTopicRanks = assignments.slice(objectiveTextItems.length);

    SOAP_SORT_SECTION_KEYS.forEach(sectionKey => {
        if (skipSections.has(sectionKey)) return;

        const sectionItems = splitSoapBulletItems(soap[sectionKey] || '');
        if (sectionItems.length > 0) {
            const sortedSectionItems = sectionKey === 'o'
                ? sortByExplicitTopicRanksStable(sectionItems, objectiveTextTopicRanks)
                : sortByTopicOrderStable(sectionItems, item => item, topics);
            soap[sectionKey] = joinSoapBulletItems(sortedSectionItems);
        }

        const suggestionKey = `${sectionKey}_suggestion`;
        if (Array.isArray(soap[suggestionKey]) && soap[suggestionKey].length > 0) {
            soap[suggestionKey] = sectionKey === 'o'
                ? sortByExplicitTopicRanksStable(soap[suggestionKey], objectiveSuggestionTopicRanks)
                : sortByTopicOrderStable(
                    soap[suggestionKey],
                    suggestion => getTopicTextFromSuggestion(suggestion),
                    topics
                );
        }
    });
};
