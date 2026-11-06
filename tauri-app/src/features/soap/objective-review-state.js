import {
    normalizeObjectiveLine,
    splitSoapBulletItems
} from './objective-ordering.js';
import {
    buildObjectiveRedundancyReviewData,
    completeObjectiveTopicGroups
} from './objective-review-model.js';

export const ensureSoapObjectiveActionState = (appointment) => {
    if (!appointment) {
        return {
            objectiveRevision: 0,
            interventionsRevision: 0,
            organizedRevision: null,
            readObjectiveRevision: null,
            readInterventionsRevision: null
        };
    }
    if (!appointment.soap) appointment.soap = { s: '', o: '', a: '', p: '' };
    if (!appointment.soap.objectiveActionState || typeof appointment.soap.objectiveActionState !== 'object') {
        appointment.soap.objectiveActionState = {};
    }
    const state = appointment.soap.objectiveActionState;
    if (!Number.isInteger(state.objectiveRevision) || state.objectiveRevision < 0) state.objectiveRevision = 0;
    if (!Number.isInteger(state.interventionsRevision) || state.interventionsRevision < 0) state.interventionsRevision = 0;
    if (!Number.isInteger(state.organizedRevision)) state.organizedRevision = null;
    if (!Number.isInteger(state.readObjectiveRevision)) state.readObjectiveRevision = null;
    if (!Number.isInteger(state.readInterventionsRevision)) state.readInterventionsRevision = null;
    return state;
};

export const isLegacySoapPresentingProblem = (appointment) => {
    const soap = appointment?.soap;
    if (!soap || soap.supportFieldsVersion === 2) return false;
    if (soap.supportFieldsVersion === 1) return true;
    if (Object.prototype.hasOwnProperty.call(soap, 'presentingProblem')) return true;
    const hasStoredSoapContent = ['s', 'o', 'a', 'p', 'interventions']
        .some(key => String(soap[key] || '').trim());
    const snapshotHasLegacySection = Array.isArray(appointment?.soapPlatformSnapshot?.sections)
        && appointment.soapPlatformSnapshot.sections.some(section =>
            (typeof section === 'string' ? section : section?.key) === 'presentingProblem'
        );
    return hasStoredSoapContent && snapshotHasLegacySection;
};

export const updateSoapFieldValue = (appointment, fieldKey, nextValue) => {
    if (!appointment) return false;
    if (!appointment.soap) appointment.soap = { s: '', o: '', a: '', p: '' };
    const next = String(nextValue ?? '');
    const current = String(appointment.soap[fieldKey] ?? '');
    if (current === next) return false;
    appointment.soap[fieldKey] = next;
    if (fieldKey === 'o') {
        if (appointment.soap.supportFieldsVersion !== 2) appointment.soap.supportFieldsVersion = 1;
        const actionState = ensureSoapObjectiveActionState(appointment);
        actionState.objectiveRevision += 1;
        delete appointment.soap.objectiveRedundancyReview;
        delete appointment.soap.diagnosticSupport;
        delete appointment.soap.medicalNecessity;
        delete appointment.soap.presentingProblem;
        delete appointment.soap.sessionFocus;
        appointment.soap.objectiveInterventionMatches = [];
        appointment.soap.interventions = '';
        actionState.organizedRevision = null;
        actionState.readObjectiveRevision = null;
        actionState.readInterventionsRevision = null;
    }
    return true;
};

export const getObjectiveRedundancyReview = (appointment) => {
    const review = appointment?.soap?.objectiveRedundancyReview;
    if (!review || !Array.isArray(review.groups)) return null;
    if (String(review.objectiveText || '').trim() !== String(appointment.soap.o || '').trim()) return null;
    if (Array.isArray(review.suggestionSnapshot)) {
        const currentSnapshot = buildObjectiveRedundancyReviewData(appointment).suggestionSnapshot;
        if (JSON.stringify(currentSnapshot) !== JSON.stringify(review.suggestionSnapshot)) return null;
    }
    if (getObjectiveRedundancyItemsForReview(review).length === 0) return null;
    const previousSelected = getSelectedObjectiveRedundancyItemIndexes(review);
    const previousGrouped = getObjectiveRedundancyGroupedItemIndexes(review);
    review.groups = completeObjectiveTopicGroups(getObjectiveRedundancyItemsForReview(review), review.groups);
    review.groups.forEach(group => {
        if (!group.id.startsWith('topic-local-')) return;
        group.selectedItemIndexes = group.itemIndexes.filter(index => (
            previousGrouped.has(index) ? getSelectedObjectiveRedundancyIndexes(group).includes(index) : previousSelected.has(index)
        ));
    });
    review.selectedItemIndexes = [...getSelectedObjectiveRedundancyItemIndexes(review)];
    if (!review.reviewId) review.reviewId = `objective-review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return review;
};

export const getObjectiveRedundancyItemsForReview = (review) => {
    if (Array.isArray(review?.items) && review.items.length > 0) return review.items;
    return splitSoapBulletItems(review?.objectiveText || '').map((text, index) => ({
        id: `O${index + 1}`,
        kind: 'objective',
        sourceIndex: index,
        text: normalizeObjectiveLine(text),
        originalText: ''
    }));
};

export const reconcileObjectiveRedundancyReview = (appointment, previousReview) => {
    if (!appointment?.soap || !previousReview) return;
    const current = buildObjectiveRedundancyReviewData(appointment);
    const previousItems = getObjectiveRedundancyItemsForReview(previousReview);
    const previousSelected = getSelectedObjectiveRedundancyItemIndexes(previousReview);
    // Item positions change when suggestions are removed or topic sorting runs.
    // Match by content and kind, consuming each occurrence once so identical
    // statements retain separate checkbox selections.
    const itemKey = item => JSON.stringify([
        item.kind,
        normalizeObjectiveLine(item.text),
        normalizeObjectiveLine(item.originalText || '')
    ]);
    const availableIndexes = new Map();
    current.items.forEach((item, index) => {
        const key = itemKey(item);
        if (!availableIndexes.has(key)) availableIndexes.set(key, []);
        availableIndexes.get(key).push(index);
    });
    const indexMap = new Map();
    previousItems.forEach((item, index) => {
        const nextIndex = availableIndexes.get(itemKey(item))?.shift();
        if (Number.isInteger(nextIndex)) indexMap.set(index, nextIndex);
    });
    const remapIndexes = indexes => (indexes || [])
        .filter(index => indexMap.has(index))
        .map(index => indexMap.get(index));
    const previousIndexByCurrentIndex = new Map([...indexMap].map(([previousIndex, currentIndex]) => [currentIndex, previousIndex]));
    const currentItems = current.items.map((item, index) => {
        const previousItem = previousItems[previousIndexByCurrentIndex.get(index)];
        return previousItem?.editedText === undefined ? item : { ...item, editedText: previousItem.editedText };
    });
    const groups = (previousReview.groups || []).map(group => ({
        ...group,
        itemIndexes: remapIndexes(group.itemIndexes),
        recommendedKeepIndexes: remapIndexes(group.recommendedKeepIndexes),
        selectedItemIndexes: remapIndexes(getSelectedObjectiveRedundancyIndexes(group))
    })).filter(group => group.itemIndexes.length > 1);
    const selectedItemIndexes = new Set(remapIndexes([...previousSelected]));
    const matchedIndexes = new Set(indexMap.values());
    current.items.forEach((item, index) => {
        // A newly accepted addition is already approved and must survive
        // a later Approve or Organize action on the pending groups.
        if (item.kind === 'objective' && !matchedIndexes.has(index)) {
            selectedItemIndexes.add(index);
        }
    });
    appointment.soap.objectiveRedundancyReview = {
        ...previousReview,
        ...current,
        items: currentItems,
        groups,
        selectedItemIndexes: [...selectedItemIndexes]
    };
};

export const getSelectedObjectiveRedundancyIndexes = (group) => {
    const itemIndexes = Array.isArray(group?.itemIndexes) ? group.itemIndexes : [];
    if (Array.isArray(group?.selectedItemIndexes)) {
        return [...new Set(group.selectedItemIndexes.filter(index => itemIndexes.includes(index)))];
    }
    return itemIndexes.length > 0 ? [itemIndexes[0]] : [];
};

export const getSelectedObjectiveRedundancyItemIndexes = (review) => {
    const reviewItems = getObjectiveRedundancyItemsForReview(review);
    const selected = new Set(
        Array.isArray(review?.selectedItemIndexes)
            ? review.selectedItemIndexes.filter(index => Number.isInteger(index) && index >= 0 && index < reviewItems.length)
            : reviewItems.map((item, index) => item.kind === 'objective' ? index : -1).filter(index => index >= 0)
    );
    (Array.isArray(review?.groups) ? review.groups : []).forEach(group => {
        const groupIndexes = Array.isArray(group?.itemIndexes)
            ? group.itemIndexes.filter(index => index >= 0 && index < reviewItems.length)
            : [];
        groupIndexes.forEach(index => selected.delete(index));
    });
    // A later overlapping group must not erase an earlier checked item.
    (Array.isArray(review?.groups) ? review.groups : []).forEach(group => {
        getSelectedObjectiveRedundancyIndexes(group).forEach(index => selected.add(index));
    });
    return selected;
};

export const getObjectiveRedundancyGroupedItemIndexes = (review) => {
    const reviewItems = getObjectiveRedundancyItemsForReview(review);
    const groupedItemIndexes = new Set();
    (Array.isArray(review?.groups) ? review.groups : []).forEach(group => {
        (Array.isArray(group?.itemIndexes) ? group.itemIndexes : []).forEach(index => {
            if (index >= 0 && index < reviewItems.length) groupedItemIndexes.add(index);
        });
    });
    return groupedItemIndexes;
};

export const getObjectiveRedundancyGroupedSuggestionSourceIndexes = (review) => {
    const reviewItems = getObjectiveRedundancyItemsForReview(review);
    const groupedItemIndexes = getObjectiveRedundancyGroupedItemIndexes(review);
    return new Set(
        reviewItems
            .filter((item, index) => item.kind === 'suggestion' && groupedItemIndexes.has(index) && Number.isInteger(item.sourceIndex))
            .map(item => item.sourceIndex)
    );
};

export const setObjectiveRedundancyItemSelected = (review, itemIndex, isSelected) => {
    if (!review || !Number.isInteger(itemIndex)) return false;
    const reviewItems = getObjectiveRedundancyItemsForReview(review);
    if (itemIndex < 0 || itemIndex >= reviewItems.length) return false;
    const groups = (Array.isArray(review.groups) ? review.groups : []).filter(candidate => (
        Array.isArray(candidate?.itemIndexes) && candidate.itemIndexes.includes(itemIndex)
    ));
    if (groups.length > 0) {
        groups.forEach(group => {
            const selectedIndexes = new Set(getSelectedObjectiveRedundancyIndexes(group));
            if (isSelected) selectedIndexes.add(itemIndex);
            else selectedIndexes.delete(itemIndex);
            group.selectedItemIndexes = [...selectedIndexes].sort((left, right) => left - right);
        });
    } else {
        const selectedIndexes = getSelectedObjectiveRedundancyItemIndexes(review);
        if (isSelected) selectedIndexes.add(itemIndex);
        else selectedIndexes.delete(itemIndex);
        review.selectedItemIndexes = [...selectedIndexes].sort((left, right) => left - right);
    }
    review.selectedItemIndexes = [...getSelectedObjectiveRedundancyItemIndexes(review)].sort((left, right) => left - right);
    return true;
};

export const getObjectiveRedundancyDecision = (review) => {
    const reviewItems = getObjectiveRedundancyItemsForReview(review);
    const selectedIndexes = getSelectedObjectiveRedundancyItemIndexes(review);
    const selectedTexts = reviewItems
        .map((item, index) => ({ item, index }))
        .filter(entry => selectedIndexes.has(entry.index))
        .map(({ item }) => normalizeObjectiveLine(item.editedText ?? item.text));
    const objectiveItems = selectedTexts.filter(Boolean);
    const manualObjectiveNote = String(review?.manualObjectiveNote || '').replace(/\s*\n+\s*/g, ' ').trim();
    if (manualObjectiveNote) objectiveItems.push(normalizeObjectiveLine(manualObjectiveNote));
    const selectedEmptyCount = selectedTexts.filter(text => !text).length;
    const reviewedSuggestionSourceIndexes = new Set(
        reviewItems
            .filter(item => item.kind === 'suggestion' && Number.isInteger(item.sourceIndex))
            .map(item => item.sourceIndex)
    );
    return {
        objectiveItems,
        manualObjectiveNote,
        selectedEmptyCount,
        reviewedSuggestionSourceIndexes
    };
};

