import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCompactDateDigits } from '../src/segmented-date-input.js';

test('parses an eight-digit MMDDYYYY date', () => {
    assert.deepEqual(parseCompactDateDigits('07111994'), {
        month: '07',
        day: '11',
        year: '1994',
        isoDate: '1994-07-11'
    });
});

test('strips date separators before parsing', () => {
    assert.equal(parseCompactDateDigits('07/11/1994').isoDate, '1994-07-11');
});

test('validates leap days and rejects invalid calendar dates', () => {
    assert.equal(parseCompactDateDigits('02292024').isoDate, '2024-02-29');
    assert.equal(parseCompactDateDigits('02292023'), null);
    assert.equal(parseCompactDateDigits('04312024'), null);
});

test('rejects incomplete values and year zero', () => {
    assert.equal(parseCompactDateDigits('0711199'), null);
    assert.equal(parseCompactDateDigits('01010000'), null);
});
