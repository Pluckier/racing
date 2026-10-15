import { describe, it } from 'node:test';
import assert from 'node:assert';
import { shouldShowFiddle, computeValueIndicator, shouldShowSelect } from '../src/utils/annotations.js';

describe('annotation helpers', () => {
  it('fiddle shows only when highlights enabled and horse.isFiddle true', () => {
    const horse = { isFiddle: true };
    assert.strictEqual(shouldShowFiddle(horse, true), true);
    assert.strictEqual(shouldShowFiddle(horse, false), false);
    assert.strictEqual(shouldShowFiddle({}, true), false);
  });

  it('value indicator returns massive when horse.isValue and highlightValues=true', () => {
    const horse = { isValue: true };
    assert.strictEqual(computeValueIndicator(horse, undefined, true), 'massive');
    assert.strictEqual(computeValueIndicator(horse, 1, true), 'massive'); // horse.isValue prioritised
    assert.strictEqual(computeValueIndicator({}, 1, true), 'top');
    assert.strictEqual(computeValueIndicator({}, 2, true), 'second');
    assert.strictEqual(computeValueIndicator({}, 3, true), 'third');
    assert.strictEqual(computeValueIndicator({}, 4, true), '4');
    assert.strictEqual(computeValueIndicator({}, undefined, true), null);
    assert.strictEqual(computeValueIndicator(horse, undefined, false), null);
  });

  it('select indicator matches select horse number only when enabled', () => {
    const horseA = { number: 7 };
    assert.strictEqual(shouldShowSelect(horseA, 7, true), true);
    assert.strictEqual(shouldShowSelect(horseA, '7', true), true);
    assert.strictEqual(shouldShowSelect(horseA, 8, true), false);
    assert.strictEqual(shouldShowSelect(horseA, 7, false), false);
  });
});
