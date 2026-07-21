import test from 'node:test';
import assert from 'node:assert/strict';

import { listenerSegmentsAreEcho, reconcileListenerEcho } from '../src/listener-echo.js';

const segment = (source, text, startMs, endMs, isFinal = true) => ({
    source,
    text,
    startMs,
    endMs,
    isFinal
});

test('matches simultaneous system audio heard by the microphone', () => {
    assert.equal(listenerSegmentsAreEcho(
        segment('client', 'Can you say Mama?', 2_000, 3_200),
        segment('counselor', 'Can you say mama', 2_080, 3_260)
    ), true);
});

test('matches progressive recognition containing the same phrase', () => {
    assert.equal(listenerSegmentsAreEcho(
        segment('client', 'So you were telling me that you are having daily headaches', 5_000, 8_000),
        segment('counselor', 'having daily headaches.', 6_500, 8_050)
    ), true);
});

test('does not remove the same words spoken as a later response', () => {
    assert.equal(listenerSegmentsAreEcho(
        segment('client', 'Hello', 1_000, 1_300),
        segment('counselor', 'Hello', 1_700, 2_000)
    ), false);
});

test('does not match different simultaneous speech', () => {
    assert.equal(listenerSegmentsAreEcho(
        segment('client', 'I did not sleep last night', 1_000, 2_500),
        segment('counselor', 'How was your appetite?', 1_100, 2_200)
    ), false);
});

test('waits for at least one finalized recognition result', () => {
    assert.equal(listenerSegmentsAreEcho(
        segment('client', 'Hello', 1_000, 1_300, false),
        segment('counselor', 'Hello', 1_020, 1_310, false)
    ), false);
});

test('matches delayed echo when recognizer timelines have different origins', () => {
    assert.equal(listenerSegmentsAreEcho(
        { ...segment('client', "I hope you're doing well.", 500, 1_600), receivedAtMs: 10_000 },
        { ...segment('counselor', "I hope we're doing well.", 8_500, 9_700), receivedAtMs: 15_000 }
    ), true);
});

test('does not match similar phrases received as separate conversation turns', () => {
    assert.equal(listenerSegmentsAreEcho(
        { ...segment('client', 'I am feeling better today', 500, 1_600), receivedAtMs: 10_000 },
        { ...segment('counselor', 'I am feeling better today', 8_500, 9_700), receivedAtMs: 30_500 }
    ), false);
});

test('keeps the client copy and removes an earlier microphone echo', () => {
    const segments = [{
        ...segment('counselor', 'Can you say Mama?', 2_080, 3_260),
        segmentId: 'counselor-2080'
    }];
    const result = reconcileListenerEcho(
        segments,
        { ...segment('client', 'Can you say mama', 2_000, 3_200), segmentId: 'client-2000' }
    );

    assert.deepEqual(result, { discardIncoming: false, removedCount: 1 });
    assert.deepEqual(segments, []);
});

test('discards a later microphone copy when direct client audio already exists', () => {
    const segments = [{
        ...segment('client', 'Hello', 1_000, 1_300),
        segmentId: 'client-1000'
    }];
    const result = reconcileListenerEcho(
        segments,
        { ...segment('counselor', 'Hello.', 1_020, 1_320), segmentId: 'counselor-1020' }
    );

    assert.deepEqual(result, { discardIncoming: true, removedCount: 0 });
    assert.equal(segments.length, 1);
    assert.equal(segments[0].source, 'client');
});
