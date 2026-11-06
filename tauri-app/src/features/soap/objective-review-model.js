import {
normalizeInterventionText,
normalizeObjectiveOrderingItem,
normalizeObjectiveLine,
splitSoapBulletItems,
soapTopicStopWords,
soapTopicWeakAnchorTokens,
stemInterventionToken,
tokenizeForSoapTopic,
buildObjectiveTopicClusters
} from './objective-ordering.js';

export const normalizeObjectiveRedundancyLabel = (value) => {
    const words = String(value || '')
        .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    while (words.length > 1 && /^(to|and|or|of|for|with|in|on)$/i.test(words[words.length - 1])) words.pop();
    if (words.length === 1) words.push('Context');
    return words.slice(0, 3).join(' ') || 'Related Topics';
};

export const normalizeObjectiveRedundancyGroupsFromAi = (reviewItems, aiPayload) => {
    const rawGroups = Array.isArray(aiPayload?.objective_groups)
        ? aiPayload.objective_groups
        : Array.isArray(aiPayload?.objectiveGroups)
            ? aiPayload.objectiveGroups
            : Array.isArray(aiPayload?.groups)
                ? aiPayload.groups
                : Array.isArray(aiPayload?.redundancy_groups)
                    ? aiPayload.redundancy_groups
                    : Array.isArray(aiPayload?.redundancyGroups)
                        ? aiPayload.redundancyGroups
                        : [];
    const claimedIndexes = new Set();
    const itemIdIndexes = new Map(
        reviewItems.map((item, index) => [String(item?.id || '').trim().toUpperCase(), index])
    );
    const parseItemId = (value) => {
        const normalizedId = String(value ?? '').trim().toUpperCase();
        const index = itemIdIndexes.get(normalizedId);
        return Number.isInteger(index) ? index : -1;
    };

    return rawGroups.map((group, groupIndex) => {
        if (!group || typeof group !== 'object') return null;
        const rawItemIds = Array.isArray(group.item_ids)
            ? group.item_ids
            : Array.isArray(group.itemIds)
                ? group.itemIds
                : [];
        const indexes = [...new Set(rawItemIds.map(parseItemId).filter(index => index >= 0))]
            .filter(index => !claimedIndexes.has(index));
        if (indexes.length < 1) return null;

        indexes.forEach(index => claimedIndexes.add(index));
        const rawRecommendedIds = Array.isArray(group.recommended_keep_ids)
            ? group.recommended_keep_ids
            : Array.isArray(group.recommendedKeepIds)
                ? group.recommendedKeepIds
                : [];
        const recommendedKeepIndexes = [...new Set(rawRecommendedIds.map(parseItemId))]
            .filter(index => indexes.includes(index));
        const selectedItemIndexes = recommendedKeepIndexes.length > 0
            ? recommendedKeepIndexes
            : [indexes[0]];

        return {
            id: String(group.group_id ?? group.groupId ?? `topic-${groupIndex + 1}`).trim() || `topic-${groupIndex + 1}`,
            label: normalizeObjectiveRedundancyLabel(group.label ?? group.title ?? group.topic),
            reason: String(group.reason ?? group.explanation ?? '').trim(),
            itemIndexes: indexes,
            recommendedKeepIndexes,
            selectedItemIndexes
        };
    }).filter(Boolean);
};

export const deriveObjectiveTopicLabel = (reviewItems, indexes) => {
    const tokenCounts = new Map();
    (indexes || []).forEach(index => {
        normalizeInterventionText(reviewItems[index]?.text)
            .split(' ')
            .filter(word => {
                const stem = stemInterventionToken(word);
                return word.length > 2 && !soapTopicStopWords.has(word) && !soapTopicWeakAnchorTokens.has(stem);
            })
            .forEach(word => tokenCounts.set(word, (tokenCounts.get(word) || 0) + 1));
    });
    const words = [...tokenCounts.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 3)
        .map(([word]) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`);
    return normalizeObjectiveRedundancyLabel(words.join(' ') || 'Related Topics');
};

export const buildLocalObjectiveTopicGroups = (reviewItems, candidateIndexes = null) => {
    const indexes = Array.isArray(candidateIndexes)
        ? candidateIndexes.filter(index => Number.isInteger(index) && index >= 0 && index < reviewItems.length)
        : reviewItems.map((_, index) => index);
    if (indexes.length === 0) return [];

    const { assignments } = buildObjectiveTopicClusters(indexes.map(index => reviewItems[index]?.text || ''));
    const buckets = new Map();
    indexes.forEach((itemIndex, localIndex) => {
        const topicIndex = assignments[localIndex];
        const key = Number.isFinite(topicIndex) ? `topic-${topicIndex}` : `single-${itemIndex}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(itemIndex);
    });

    return [...buckets.values()].map((itemIndexes, groupIndex) => ({
        id: `topic-local-${groupIndex + 1}`,
        label: deriveObjectiveTopicLabel(reviewItems, itemIndexes),
        reason: '',
        itemIndexes,
        recommendedKeepIndexes: [itemIndexes[0]],
        selectedItemIndexes: [itemIndexes[0]]
    }));
};

export const completeObjectiveTopicGroups = (reviewItems, groups) => {
    const claimedIndexes = new Set();
    const completeGroups = (Array.isArray(groups) ? groups : []).map((group, groupIndex) => {
        const itemIndexes = [...new Set(Array.isArray(group?.itemIndexes) ? group.itemIndexes : [])]
            .filter(index => Number.isInteger(index) && index >= 0 && index < reviewItems.length && !claimedIndexes.has(index));
        if (itemIndexes.length === 0) return null;
        itemIndexes.forEach(index => claimedIndexes.add(index));
        const selectedItemIndexes = Array.isArray(group.selectedItemIndexes)
            ? [...new Set(group.selectedItemIndexes.filter(index => itemIndexes.includes(index)))]
            : [itemIndexes[0]];
        return {
            ...group,
            id: String(group.id || `topic-${groupIndex + 1}`),
            label: normalizeObjectiveRedundancyLabel(String(group.label || '')
                .replace(/^Objective\s+Grouping\s+\d+\s*:\s*/i, '')
                .replace(/\s*\(\d+\s+statements?\)\s*$/i, '')),
            itemIndexes,
            recommendedKeepIndexes: Array.isArray(group.recommendedKeepIndexes)
                ? group.recommendedKeepIndexes.filter(index => itemIndexes.includes(index))
                : [],
            selectedItemIndexes
        };
    }).filter(Boolean);

    const unassignedIndexes = reviewItems.map((_, index) => index).filter(index => !claimedIndexes.has(index));
    completeGroups.push(...buildLocalObjectiveTopicGroups(reviewItems, unassignedIndexes));
    return completeGroups;
};

export const limitObjectiveReviewDefaults = (groups, limit = 5) => {
    const recommendedIndexes = [];
    (Array.isArray(groups) ? groups : []).forEach(group => {
        (Array.isArray(group?.selectedItemIndexes) ? group.selectedItemIndexes : []).forEach(index => {
            if (!recommendedIndexes.includes(index)) recommendedIndexes.push(index);
        });
    });
    const selected = new Set(recommendedIndexes.slice(0, Math.max(1, limit)));
    return (Array.isArray(groups) ? groups : []).map(group => ({
        ...group,
        selectedItemIndexes: (group.selectedItemIndexes || []).filter(index => selected.has(index))
    }));
};

export const buildLocalObjectiveRedundancyGroups = (reviewItems) => {
    const buckets = new Map();
    reviewItems.forEach((item, index) => {
        const key = normalizeObjectiveOrderingItem(item?.text);
        if (!key) return;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(index);
    });

    return [...buckets.values()]
        .filter(indexes => indexes.length > 1)
        .map((indexes, index) => ({
            id: `redundancy-${index + 1}`,
            label: 'Repeated',
            reason: 'These statements are exact or near duplicates after normalization.',
            itemIndexes: indexes,
            recommendedKeepIndexes: [indexes[0]],
            selectedItemIndexes: [indexes[0]]
        }));
};

export const OBJECTIVE_REDUNDANCY_WEAK_TOKENS = new Set([
    'adjust', 'anxiet', 'behavio', 'believ', 'coping', 'depress', 'engag', 'emotion',
    'experienc', 'explor', 'feel', 'ident', 'interperson', 'internal', 'mean', 'narrativ',
    'pattern', 'personal', 'profession', 'relat', 'self', 'social', 'support', 'treatment',
    'value', 'work'
]);

export const getObjectiveRedundancyContentTokens = (text) => new Set(
    tokenizeForSoapTopic(text)
        .filter(token => token.length > 2)
);

export const buildHighConfidenceObjectiveRedundancyGroups = (reviewItems) => {
    const objectiveItems = reviewItems
        .map((item, index) => ({ item, index }))
        .filter(entry => entry.item?.kind === 'objective');
    const suggestionItems = reviewItems
        .map((item, index) => ({ item, index }))
        .filter(entry => entry.item?.kind === 'suggestion');
    const candidates = [];

    objectiveItems.forEach(objectiveEntry => {
        const objectiveTokens = getObjectiveRedundancyContentTokens(objectiveEntry.item.text);
        suggestionItems.forEach(suggestionEntry => {
            const suggestionTokens = getObjectiveRedundancyContentTokens(suggestionEntry.item.text);
            const sharedTokens = [...objectiveTokens].filter(token => suggestionTokens.has(token));
            const strongSharedTokens = sharedTokens.filter(token => !OBJECTIVE_REDUNDANCY_WEAK_TOKENS.has(token));
            if (sharedTokens.length < 2 || strongSharedTokens.length === 0) return;

            candidates.push({
                id: `redundancy-local-${objectiveEntry.index + 1}-${suggestionEntry.index + 1}`,
                label: 'Repeated',
                reason: 'These statements share the same documented event or intervention with distinct wording.',
                itemIndexes: [objectiveEntry.index, suggestionEntry.index],
                recommendedKeepIndexes: [objectiveEntry.index],
                selectedItemIndexes: [objectiveEntry.index],
                score: (strongSharedTokens.length * 10) + sharedTokens.length
            });
        });
    });

    return candidates.sort((left, right) => right.score - left.score);
};

export const mergeObjectiveRedundancyGroups = (reviewItems, primaryGroups, supplementalGroups) => {
    const mergedGroups = (Array.isArray(primaryGroups) ? primaryGroups : []).map(group => ({
        ...group,
        itemIndexes: [...(Array.isArray(group?.itemIndexes) ? group.itemIndexes : [])],
        recommendedKeepIndexes: [...(Array.isArray(group?.recommendedKeepIndexes) ? group.recommendedKeepIndexes : [])],
        selectedItemIndexes: [...(Array.isArray(group?.selectedItemIndexes) ? group.selectedItemIndexes : [])]
    }));

    (Array.isArray(supplementalGroups) ? supplementalGroups : []).forEach(candidate => {
        const candidateIndexes = [...new Set(Array.isArray(candidate?.itemIndexes) ? candidate.itemIndexes : [])]
            .filter(index => index >= 0 && index < reviewItems.length);
        if (candidateIndexes.length < 2) return;
        const overlappingGroups = mergedGroups.filter(group => (
            group.itemIndexes.some(index => candidateIndexes.includes(index))
        ));
        if (overlappingGroups.length === 0) {
            mergedGroups.push({
                ...candidate,
                itemIndexes: candidateIndexes,
                recommendedKeepIndexes: [...(candidate.recommendedKeepIndexes || [])],
                selectedItemIndexes: [...(candidate.selectedItemIndexes || [])]
            });
            return;
        }
        if (overlappingGroups.length === 1) {
            const target = overlappingGroups[0];
            candidateIndexes.forEach(index => {
                if (!target.itemIndexes.includes(index)) target.itemIndexes.push(index);
            });
        }
    });

    return mergedGroups.sort((left, right) => (
        Math.min(...left.itemIndexes) - Math.min(...right.itemIndexes)
    ));
};

export const getObjectiveRedundancySuggestionItems = (appointment) => {
    const suggestions = Array.isArray(appointment?.soap?.o_suggestion)
        ? appointment.soap.o_suggestion
        : [];
    return suggestions.map((suggestion, index) => {
        const text = typeof suggestion === 'object' && suggestion
            ? suggestion.suggested || suggestion.original || ''
            : suggestion;
        const originalText = typeof suggestion === 'object' && suggestion
            ? normalizeObjectiveLine(suggestion.original || '')
            : '';
        return {
            id: `S${index + 1}`,
            kind: 'suggestion',
            sourceIndex: index,
            text: normalizeObjectiveLine(text),
            originalText
        };
    }).filter(item => item.text);
};

export const buildObjectiveRedundancyReviewData = (appointment) => {
    const objectiveText = String(appointment?.soap?.o || '').trim();
    const objectiveItems = splitSoapBulletItems(objectiveText)
        .map((text, index) => ({
            id: `O${index + 1}`,
            kind: 'objective',
            sourceIndex: index,
            text: normalizeObjectiveLine(text)
        }));
    const suggestionItems = getObjectiveRedundancySuggestionItems(appointment);
    return {
        objectiveText,
        suggestionSnapshot: suggestionItems.map(item => ({
            sourceIndex: item.sourceIndex,
            text: item.text,
            originalText: item.originalText || ''
        })),
        items: [...objectiveItems, ...suggestionItems]
    };
};

