import test from 'node:test';
import assert from 'node:assert/strict';

import {
    listenerSegmentsAreEcho,
    reconcileListenerEcho,
    removeListenerEchoes
} from '../src/listener-echo.js';

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

test('matches long playback leakage despite recognition wording drift', () => {
    assert.equal(listenerSegmentsAreEcho(
        {
            ...segment(
                'client',
                'So lately I have kind of been thinking about those aspects of therapy that are so ingrained, default, and innate that we do not talk about them much.',
                500,
                9_000
            ),
            receivedAtMs: 20_000
        },
        {
            ...segment(
                'counselor',
                'So lately I have kind of been thinking about those aspects of therapy that are so ingrained, deepault, innate that we do not end up talking about them that much.',
                8_500,
                17_000
            ),
            receivedAtMs: 37_000
        }
    ), true);
});

test('discards one counselor echo assembled from multiple client segments', () => {
    const segments = [
        {
            ...segment('client', 'What is up everybody?', 500, 1_600),
            segmentId: 'client-500',
            receivedAtMs: 10_000
        },
        {
            ...segment('client', 'I hope you are doing well.', 1_700, 3_200),
            segmentId: 'client-1700',
            receivedAtMs: 12_000
        }
    ];

    const result = reconcileListenerEcho(segments, {
        ...segment('counselor', 'What is up everybody, I hope we are doing well.', 8_500, 11_700),
        segmentId: 'counselor-8500',
        receivedAtMs: 18_000
    });

    assert.equal(result.discardIncoming, true);
    assert.equal(segments.length, 2);
    assert.ok(segments.every(entry => entry.source === 'client'));
});

test('removes multiple counselor fragments when the final client segment arrives', () => {
    const segments = [
        {
            ...segment('counselor', 'What is up everybody?', 8_500, 9_600),
            segmentId: 'counselor-8500',
            receivedAtMs: 14_000
        },
        {
            ...segment('counselor', 'I hope we are doing well.', 9_700, 11_200),
            segmentId: 'counselor-9700',
            receivedAtMs: 16_000
        }
    ];

    const result = reconcileListenerEcho(segments, {
        ...segment('client', 'What is up everybody? I hope you are doing well.', 500, 3_200),
        segmentId: 'client-500',
        receivedAtMs: 10_000
    });

    assert.deepEqual(result, { discardIncoming: false, removedCount: 2 });
    assert.deepEqual(segments, []);
});

test('final transcript reconciliation removes split echoes without touching distinct overlap', () => {
    const segments = [
        {
            ...segment('client', 'I have not been sleeping and feel exhausted at work.', 500, 4_000),
            segmentId: 'client-500',
            receivedAtMs: 10_000
        },
        {
            ...segment('counselor', 'I have not been sleeping', 8_000, 9_500),
            segmentId: 'counselor-8000',
            receivedAtMs: 13_000
        },
        {
            ...segment('counselor', 'and feel exhausted at work.', 9_600, 11_000),
            segmentId: 'counselor-9600',
            receivedAtMs: 15_000
        },
        {
            ...segment('counselor', 'How has that affected your concentration?', 11_100, 12_500),
            segmentId: 'counselor-11100',
            receivedAtMs: 16_000
        }
    ];

    assert.equal(removeListenerEchoes(segments), 2);
    assert.deepEqual(
        segments.map(entry => [entry.source, entry.text]),
        [
            ['client', 'I have not been sleeping and feel exhausted at work.'],
            ['counselor', 'How has that affected your concentration?']
        ]
    );
});

test('does not collapse a short repeated phrase from a later turn', () => {
    assert.equal(listenerSegmentsAreEcho(
        {
            ...segment('client', 'Thank you', 500, 900),
            receivedAtMs: 10_000
        },
        {
            ...segment('counselor', 'Thank you', 8_500, 8_900),
            receivedAtMs: 15_000
        }
    ), false);
});
