import {
    normalizeInterventionText,
    tokenizeForInterventionMatch,
    splitSoapBulletItems
} from '../soap/objective-ordering.js';

export const OBJECTIVE_INTERVENTION_MIN_TARGET = 8;
export const OBJECTIVE_INTERVENTION_MAX_COUNT = 15;
const OBJECTIVE_INTERVENTION_MIN_SUPPORT_SCORE = 2;
const OBJECTIVE_INTERVENTION_SUPPORT_SCORES = Object.freeze({
    explicit: 4,
    direct: 3,
    strong: 2,
    interpretive: 1,
    stretch: 0
});

const interventionStopWords = new Set(['and', 'or', 'the', 'with', 'for', 'to', 'of', 'in', 'on', 'a', 'an', 'by']);
const interventionWeakAnchorTokens = new Set([
    'skill', 'skills', 'support', 'treatment', 'therapeutic', 'therapy',
    'practice', 'practic', 'development', 'processing', 'reflection',
    'training', 'train', 'exploration', 'explore', 'management', 'manage'
]);

const stripInterventionMatchPrefix = (value) => String(value || '').replace(/^[A-Za-z][A-Za-z\s/&-]{0,12}:\s*/, '').trim();

const normalizeInterventionMatchKey = (value) => normalizeInterventionText(stripInterventionMatchPrefix(value));

const getInterventionMatchTokens = (value) => tokenizeForInterventionMatch(value)
    .filter(token => token.length > 2 && !interventionStopWords.has(token));

const getInterventionSupportPhrases = (value) => {
    const canonical = normalizeInterventionMatchKey(value);
    const phrases = new Set();

    if (canonical.includes('socratic question')) {
        phrases.add('socratic questioning');
        phrases.add('socratic question');
    }
    if (canonical.includes('deconstruction') || canonical.includes('deconstruct')) {
        phrases.add('deconstruct');
        phrases.add('deconstructed');
        phrases.add('deconstructing');
    }
    if (canonical.includes('externalization') || canonical.includes('externalize')) {
        phrases.add('externalize');
        phrases.add('externalized');
        phrases.add('externalizing');
        phrases.add('externalization');
    }
    if ((canonical === 're framing' || canonical === 'reframing' || canonical === 're frame') && !canonical.includes('cognitive')) {
        phrases.add('reframe');
        phrases.add('reframed');
        phrases.add('reframing');
    }
    if (canonical.includes('preferred narrative')) {
        phrases.add('preferred narrative');
        phrases.add('narrative of agency');
        phrases.add('narrative of choice');
        phrases.add('agency and choice');
    }
    if (canonical.includes('problem saturated narrative')) {
        phrases.add('problem saturated narrative');
    }
    if ((canonical.includes('relational') || canonical.includes('relationship')) && canonical.includes('template')) {
        phrases.add('relational template');
        phrases.add('relational templates');
        phrases.add('relationship template');
        phrases.add('relationship templates');
        phrases.add('relational history');
        phrases.add('unresolved relational templates');
    }

    return [...phrases]
        .map(phrase => normalizeInterventionText(phrase))
        .filter(Boolean);
};

const interventionTokensLooselyMatch = (left, right) => {
    const a = String(left || '').trim();
    const b = String(right || '').trim();
    if (!a || !b) return false;
    if (a === b) return true;
    return Math.min(a.length, b.length) >= 5 && (a.startsWith(b) || b.startsWith(a));
};

const countLooselyMatchedInterventionTokens = (sourceTokens, targetTokens) => {
    const targetList = targetTokens instanceof Set
        ? [...targetTokens]
        : Array.isArray(targetTokens)
            ? targetTokens
            : [];
    if (!Array.isArray(sourceTokens) || sourceTokens.length === 0 || targetList.length === 0) return 0;
    return sourceTokens.filter(token => targetList.some(target => interventionTokensLooselyMatch(token, target))).length;
};

const buildInterventionBankMeta = (bank) => (Array.isArray(bank) ? bank : [])
    .filter(Boolean)
    .map(item => {
        const matchSource = stripInterventionMatchPrefix(item);
        const normalized = normalizeInterventionText(matchSource);
        const tokens = getInterventionMatchTokens(matchSource);
        const strongTokens = tokens.filter(token => !interventionWeakAnchorTokens.has(token));
        const supportPhrases = getInterventionSupportPhrases(item);
        return { item, normalized, tokens, strongTokens, supportPhrases };
    })
    .filter(entry => entry.normalized.length > 0);

const hasStrictInterventionTokenCoverage = (entry, textTokens) => {
    if (!entry || !Array.isArray(entry.tokens) || entry.tokens.length === 0 || !(textTokens instanceof Set) || textTokens.size === 0) {
        return false;
    }

    const overlapAll = countLooselyMatchedInterventionTokens(entry.tokens, textTokens);
    if (overlapAll === 0) return false;
    if (entry.tokens.length === 1) return overlapAll === 1;

    const requiredTokens = entry.strongTokens.length > 0 ? entry.strongTokens : entry.tokens;
    const requiredMatched = countLooselyMatchedInterventionTokens(requiredTokens, textTokens);
    if (requiredMatched !== requiredTokens.length) return false;

    if (entry.tokens.length === 2) return overlapAll === 2;

    const allowedMisses = entry.strongTokens.length < entry.tokens.length ? 1 : 0;
    return overlapAll >= entry.tokens.length - allowedMisses;
};

const doesTextDirectlySupportIntervention = (text, entry) => {
    if (!entry?.normalized) return false;
    const normalizedText = normalizeInterventionText(text);
    if (!normalizedText) return false;
    if (normalizedText.includes(entry.normalized)) return true;
    if (Array.isArray(entry.supportPhrases) && entry.supportPhrases.some(phrase => phrase && normalizedText.includes(phrase))) {
        return true;
    }
    return hasStrictInterventionTokenCoverage(entry, new Set(getInterventionMatchTokens(text)));
};

const normalizeObjectiveInterventionSupportLevel = (value) => {
    const normalized = normalizeInterventionText(value);
    if (!normalized) return 'direct';
    if (normalized.includes('stretch') || normalized.includes('specul') || normalized.includes('weak') || normalized.includes('unclear')) {
        return 'stretch';
    }
    if (normalized.includes('interpret') || normalized.includes('moderate') || normalized.includes('possible') || normalized.includes('infer')) {
        return 'interpretive';
    }
    if (normalized.includes('explicit') || normalized.includes('verbatim') || normalized.includes('exact') || normalized.includes('named')) {
        return 'explicit';
    }
    if (normalized.includes('strong') || normalized.includes('high confidence') || normalized.includes('high support')) {
        return 'strong';
    }
    if (normalized.includes('direct') || normalized.includes('clear')) {
        return 'direct';
    }
    return 'direct';
};

const getObjectiveInterventionSupportScore = (value) => {
    const supportLevel = normalizeObjectiveInterventionSupportLevel(value);
    return OBJECTIVE_INTERVENTION_SUPPORT_SCORES[supportLevel] ?? OBJECTIVE_INTERVENTION_SUPPORT_SCORES.direct;
};

const normalizeObjectiveInterventionCandidate = (candidate, rank) => {
    if (typeof candidate === 'string') {
        const name = candidate.replace(/^•\s*/, '').trim();
        return name ? { name, support: 'direct', rank } : null;
    }

    if (!candidate || typeof candidate !== 'object') return null;

    const name = String(
        candidate.name
        || candidate.intervention
        || candidate.item
        || candidate.match
        || candidate.label
        || ''
    ).replace(/^•\s*/, '').trim();
    if (!name) return null;

    return {
        name,
        support: normalizeObjectiveInterventionSupportLevel(
            candidate.support
            || candidate.strength
            || candidate.directness
            || candidate.confidence
            || ''
        ),
        rank
    };
};

export const selectInterventionsFromBank = (bank, aiInterventionsText) => {
    if (!Array.isArray(bank) || bank.length === 0) return [];

    let rawCandidates = [];
    if (typeof aiInterventionsText === 'string') {
        rawCandidates = aiInterventionsText.split(/\n+/).map(line => line.replace(/^•\s*/, '').trim()).filter(Boolean);
    } else if (Array.isArray(aiInterventionsText)) {
        rawCandidates = aiInterventionsText;
    }

    const aiCandidates = rawCandidates
        .map((candidate, rank) => normalizeObjectiveInterventionCandidate(candidate, rank))
        .filter(Boolean);

    if (aiCandidates.length === 0) return [];

    const selectedByItem = new Map();
    const bankMeta = buildInterventionBankMeta(bank);
    const exactNameMap = new Map();
    const normalizedNameMap = new Map();
    const normalizedCoreNameMap = new Map();

    bank.forEach(item => {
        const exactKey = String(item || '').trim();
        const normalizedKey = normalizeInterventionText(item);
        const normalizedCoreKey = normalizeInterventionMatchKey(item);

        if (exactKey) exactNameMap.set(exactKey, item);
        if (normalizedKey) normalizedNameMap.set(normalizedKey, item);
        if (normalizedCoreKey) {
            if (!normalizedCoreNameMap.has(normalizedCoreKey)) {
                normalizedCoreNameMap.set(normalizedCoreKey, []);
            }
            normalizedCoreNameMap.get(normalizedCoreKey).push(item);
        }
    });

    aiCandidates.forEach(candidate => {
        const line = candidate.name;
        let resolvedItem = exactNameMap.get(line) || null;

        if (!resolvedItem) {
            resolvedItem = normalizedNameMap.get(normalizeInterventionText(line)) || null;
        }

        if (!resolvedItem) {
            const coreMatches = normalizedCoreNameMap.get(normalizeInterventionMatchKey(line)) || [];
            if (coreMatches.length === 1) {
                resolvedItem = coreMatches[0];
            }
        }

        if (!resolvedItem) {
            const fuzzyMatches = bankMeta.filter(entry => doesTextDirectlySupportIntervention(line, entry));
            if (fuzzyMatches.length === 1) {
                resolvedItem = fuzzyMatches[0].item;
            }
        }

        if (!resolvedItem) return;

        const score = getObjectiveInterventionSupportScore(candidate.support);
        const existing = selectedByItem.get(resolvedItem);
        if (!existing || score > existing.score || (score === existing.score && candidate.rank < existing.rank)) {
            selectedByItem.set(resolvedItem, {
                item: resolvedItem,
                score,
                rank: candidate.rank
            });
        }
    });

    return [...selectedByItem.values()]
        .filter(candidate => candidate.score >= OBJECTIVE_INTERVENTION_MIN_SUPPORT_SCORE)
        .sort((left, right) => {
            if (right.score !== left.score) return right.score - left.score;
            if (left.rank !== right.rank) return left.rank - right.rank;
            return interventionBankCollator.compare(left.item, right.item);
        })
        .slice(0, OBJECTIVE_INTERVENTION_MAX_COUNT)
        .map(candidate => candidate.item);
};

export const extractInterventionsFromObjective = (objectiveText, bank) => {
    const objectiveItems = splitSoapBulletItems(objectiveText);
    const searchTexts = objectiveItems.length > 0 ? objectiveItems : [objectiveText];
    if (searchTexts.every(text => !String(text || '').trim())) return [];

    const bankMeta = buildInterventionBankMeta(bank);
    return bankMeta
        .filter(entry => searchTexts.some(text => doesTextDirectlySupportIntervention(text, entry)))
        .map(entry => entry.item);
};

