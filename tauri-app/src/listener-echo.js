const ECHO_TIME_PADDING_MS = 250;
const ECHO_START_TOLERANCE_MS = 1_500;
const MAX_WINDOW_SEGMENTS = 4;
const MAX_WINDOW_SPAN_MS = 20_000;
const MAX_WINDOW_TOKENS = 100;

const normalizeTranscriptText = (text) => String(text || '')
    .toLocaleLowerCase('en-US')
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9']+/g, ' ')
    .trim();

const transcriptTokens = (text) => normalizeTranscriptText(text)
    .split(' ')
    .filter(Boolean);

const tokenDiceScore = (leftTokens, rightTokens) => {
    const remaining = new Map();
    leftTokens.forEach(token => remaining.set(token, (remaining.get(token) || 0) + 1));
    let shared = 0;
    rightTokens.forEach(token => {
        const count = remaining.get(token) || 0;
        if (count > 0) {
            shared += 1;
            remaining.set(token, count - 1);
        }
    });
    return (2 * shared) / Math.max(1, leftTokens.length + rightTokens.length);
};

const orderedTokenCoverage = (leftTokens, rightTokens) => {
    const previous = new Array(rightTokens.length + 1).fill(0);
    for (const leftToken of leftTokens) {
        let diagonal = 0;
        for (let rightIndex = 1; rightIndex <= rightTokens.length; rightIndex += 1) {
            const previousRow = previous[rightIndex];
            if (leftToken === rightTokens[rightIndex - 1]) {
                previous[rightIndex] = diagonal + 1;
            } else {
                previous[rightIndex] = Math.max(previous[rightIndex], previous[rightIndex - 1]);
            }
            diagonal = previousRow;
        }
    }
    return previous[rightTokens.length] / Math.max(1, Math.min(leftTokens.length, rightTokens.length));
};

const characterBigramScore = (leftText, rightText) => {
    const toBigrams = (text) => {
        const compact = normalizeTranscriptText(text).replaceAll(' ', '');
        if (compact.length < 2) return [compact];
        return Array.from({ length: compact.length - 1 }, (_, index) => compact.slice(index, index + 2));
    };
    return tokenDiceScore(toBigrams(leftText), toBigrams(rightText));
};

const textsLikelyMatch = (leftText, rightText) => {
    const left = normalizeTranscriptText(leftText);
    const right = normalizeTranscriptText(rightText);
    if (!left || !right) return false;
    if (left === right) return true;

    const leftTokens = transcriptTokens(left);
    const rightTokens = transcriptTokens(right);
    const shorter = leftTokens.length <= rightTokens.length ? leftTokens : rightTokens;
    const longerText = leftTokens.length <= rightTokens.length ? ` ${right} ` : ` ${left} `;
    if (shorter.length >= 2 && longerText.includes(` ${shorter.join(' ')} `)) return true;
    if (shorter.length < 3) return false;

    const tokenScore = tokenDiceScore(leftTokens, rightTokens);
    const orderedScore = orderedTokenCoverage(leftTokens, rightTokens);
    const characterScore = characterBigramScore(left, right);
    if (shorter.length <= 4) {
        return orderedScore >= 0.75 && (tokenScore >= 0.7 || characterScore >= 0.82);
    }
    return orderedScore >= 0.65 && (tokenScore >= 0.62 || characterScore >= 0.76);
};

const receiptWindowFor = (leftText, rightText) => {
    const shorterLength = Math.min(
        transcriptTokens(leftText).length,
        transcriptTokens(rightText).length
    );
    if (shorterLength <= 2) return 3_500;
    if (shorterLength <= 4) return 8_000;
    if (shorterLength <= 6) return 15_000;
    return 30_000;
};

const segmentSortTime = (segment) => Number(segment.receivedAtMs)
    || Number(segment.startMs)
    || Number(segment.sequenceNumber)
    || 0;

const createWindowSegment = (entries, source) => {
    const receivedTimes = entries
        .map(entry => Number(entry.segment.receivedAtMs) || 0)
        .filter(Boolean);
    const starts = entries.map(entry => Number(entry.segment.startMs) || 0);
    const ends = entries.map(entry => Number(entry.segment.endMs) || Number(entry.segment.startMs) || 0);
    return {
        source,
        text: entries.map(entry => entry.segment.text).join(' '),
        isFinal: entries.some(entry => entry.segment.isFinal),
        startMs: Math.min(...starts),
        endMs: Math.max(...ends),
        receivedAtMs: receivedTimes.length
            ? (Math.min(...receivedTimes) + Math.max(...receivedTimes)) / 2
            : 0
    };
};

const buildSegmentWindows = (
    segmentEntries,
    source,
    { requireFinal = false, requiredMarker = null } = {}
) => {
    const entries = segmentEntries
        .filter(entry => entry.segment?.source === source)
        .filter(entry => entry.segment?.text?.trim())
        .filter(entry => !requireFinal || entry.segment.isFinal)
        .sort((left, right) => segmentSortTime(left.segment) - segmentSortTime(right.segment));
    const windows = [];

    for (let start = 0; start < entries.length; start += 1) {
        const currentEntries = [];
        for (let end = start; end < Math.min(entries.length, start + MAX_WINDOW_SEGMENTS); end += 1) {
            currentEntries.push(entries[end]);
            const firstTime = segmentSortTime(currentEntries[0].segment);
            const lastTime = segmentSortTime(currentEntries[currentEntries.length - 1].segment);
            if (lastTime - firstTime > MAX_WINDOW_SPAN_MS) break;
            if (transcriptTokens(currentEntries.map(entry => entry.segment.text).join(' ')).length > MAX_WINDOW_TOKENS) break;
            if (requiredMarker && !currentEntries.some(entry => entry.marker === requiredMarker)) continue;

            windows.push({
                entries: [...currentEntries],
                segment: createWindowSegment(currentEntries, source)
            });
        }
    }
    return windows;
};

export const listenerSegmentsAreEcho = (left, right) => {
    if (!left || !right || left.source === right.source) return false;
    if (!left.isFinal && !right.isFinal) return false;
    if (!textsLikelyMatch(left.text, right.text)) return false;

    const leftStart = Number(left.startMs) || 0;
    const leftEnd = Math.max(leftStart, Number(left.endMs) || leftStart);
    const rightStart = Number(right.startMs) || 0;
    const rightEnd = Math.max(rightStart, Number(right.endMs) || rightStart);
    const rangesOverlap = leftStart <= rightEnd + ECHO_TIME_PADDING_MS
        && rightStart <= leftEnd + ECHO_TIME_PADDING_MS;
    const boundariesAlign = Math.abs(leftStart - rightStart) <= ECHO_START_TOLERANCE_MS
        || Math.abs(leftEnd - rightEnd) <= ECHO_START_TOLERANCE_MS;
    const leftReceivedAt = Number(left.receivedAtMs) || 0;
    const rightReceivedAt = Number(right.receivedAtMs) || 0;
    const receivedNearEachOther = leftReceivedAt > 0
        && rightReceivedAt > 0
        && Math.abs(leftReceivedAt - rightReceivedAt) <= receiptWindowFor(left.text, right.text);
    return (rangesOverlap && boundariesAlign) || receivedNearEachOther;
};

const findCounselorEchoIndexes = (segments, authoritativeClientEntries) => {
    const clientWindows = buildSegmentWindows(
        authoritativeClientEntries,
        'client',
        { requireFinal: true }
    );
    if (!clientWindows.length) return new Set();

    const counselorEntries = segments.map((segment, index) => ({ segment, index }));
    const counselorWindows = buildSegmentWindows(counselorEntries, 'counselor')
        .sort((left, right) => left.entries.length - right.entries.length);
    const echoIndexes = new Set();

    for (const counselorWindow of counselorWindows) {
        if (counselorWindow.entries.some(entry => echoIndexes.has(entry.index))) continue;
        const matchesClient = clientWindows.some(clientWindow =>
            listenerSegmentsAreEcho(clientWindow.segment, counselorWindow.segment)
        );
        if (matchesClient) {
            counselorWindow.entries.forEach(entry => echoIndexes.add(entry.index));
        }
    }
    return echoIndexes;
};

const removeIndexes = (segments, indexes) => {
    [...indexes]
        .sort((left, right) => right - left)
        .forEach(index => segments.splice(index, 1));
    return indexes.size;
};

export const removeListenerEchoes = (segments) => {
    const clientEntries = segments.map((segment, index) => ({ segment, index }));
    return removeIndexes(segments, findCounselorEchoIndexes(segments, clientEntries));
};

export const reconcileListenerEcho = (segments, incomingSegment) => {
    if (incomingSegment.source === 'client') {
        if (!incomingSegment.isFinal) {
            return { discardIncoming: false, removedCount: 0 };
        }

        const incomingMarker = Symbol('incoming-client');
        const clientEntries = segments
            .filter(segment => segment.segmentId !== incomingSegment.segmentId)
            .map((segment, index) => ({ segment, index }));
        clientEntries.push({
            segment: incomingSegment,
            index: -1,
            marker: incomingMarker
        });
        const clientWindows = buildSegmentWindows(
            clientEntries,
            'client',
            { requireFinal: true, requiredMarker: incomingMarker }
        );
        const counselorEntries = segments.map((segment, index) => ({ segment, index }));
        const counselorWindows = buildSegmentWindows(counselorEntries, 'counselor')
            .sort((left, right) => left.entries.length - right.entries.length);
        const echoIndexes = new Set();

        for (const counselorWindow of counselorWindows) {
            if (counselorWindow.entries.some(entry => echoIndexes.has(entry.index))) continue;
            if (clientWindows.some(clientWindow =>
                listenerSegmentsAreEcho(clientWindow.segment, counselorWindow.segment)
            )) {
                counselorWindow.entries.forEach(entry => echoIndexes.add(entry.index));
            }
        }
        return {
            discardIncoming: false,
            removedCount: removeIndexes(segments, echoIndexes)
        };
    }

    const clientEntries = segments.map((segment, index) => ({ segment, index }));
    const clientWindows = buildSegmentWindows(clientEntries, 'client', { requireFinal: true });
    const duplicatesClientAudio = clientWindows.some(clientWindow =>
        listenerSegmentsAreEcho(clientWindow.segment, incomingSegment)
    );
    if (!duplicatesClientAudio) return { discardIncoming: false, removedCount: 0 };

    const staleIndex = segments.findIndex(segment => segment.segmentId === incomingSegment.segmentId);
    if (staleIndex >= 0) segments.splice(staleIndex, 1);
    return { discardIncoming: true, removedCount: staleIndex >= 0 ? 1 : 0 };
};
