const ECHO_TIME_PADDING_MS = 250;
const ECHO_START_TOLERANCE_MS = 1_000;
const ECHO_RECEIPT_WINDOW_MS = 15_000;

const normalizeTranscriptText = (text) => String(text || '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9']+/g, ' ')
    .trim();

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

const textsLikelyMatch = (leftText, rightText) => {
    const left = normalizeTranscriptText(leftText);
    const right = normalizeTranscriptText(rightText);
    if (!left || !right) return false;
    if (left === right) return true;

    const leftTokens = left.split(' ');
    const rightTokens = right.split(' ');
    const shorter = leftTokens.length <= rightTokens.length ? leftTokens : rightTokens;
    const longerText = leftTokens.length <= rightTokens.length ? ` ${right} ` : ` ${left} `;
    if (shorter.length >= 2 && longerText.includes(` ${shorter.join(' ')} `)) return true;
    if (shorter.length < 3) return false;
    return tokenDiceScore(leftTokens, rightTokens) >= 0.75;
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
        && Math.abs(leftReceivedAt - rightReceivedAt) <= ECHO_RECEIPT_WINDOW_MS;
    return (rangesOverlap && boundariesAlign) || receivedNearEachOther;
};

export const reconcileListenerEcho = (segments, incomingSegment) => {
    if (incomingSegment.source === 'client') {
        let removedCount = 0;
        for (let index = segments.length - 1; index >= 0; index -= 1) {
            if (segments[index].source === 'counselor'
                && listenerSegmentsAreEcho(segments[index], incomingSegment)) {
                segments.splice(index, 1);
                removedCount += 1;
            }
        }
        return { discardIncoming: false, removedCount };
    }

    const duplicatesClientAudio = segments.some(segment => segment.source === 'client'
        && listenerSegmentsAreEcho(segment, incomingSegment));
    if (!duplicatesClientAudio) return { discardIncoming: false, removedCount: 0 };

    const staleIndex = segments.findIndex(segment => segment.segmentId === incomingSegment.segmentId);
    if (staleIndex >= 0) segments.splice(staleIndex, 1);
    return { discardIncoming: true, removedCount: staleIndex >= 0 ? 1 : 0 };
};
