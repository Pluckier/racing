import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isNiceRace } from '../src/utils/racingLogic.js';
import { useStore } from '../src/store/store.js';

describe('isNiceRace helper', () => {
  it('identifies handicap races with 8+ runners as nice races', () => {
    const race = {
      detail: '3yo+ Handicap (Class 4)',
      horses: Array.from({ length: 8 }, (_, i) => ({ id: `horse-${i}` }))
    };
    assert.strictEqual(isNiceRace(race), true);
  });

  it('identifies nursery races with 8+ runners as nice races', () => {
    const race = {
      detail: '2yo Nursery Handicap',
      horses: Array.from({ length: 10 }, (_, i) => ({ id: `horse-${i}` }))
    };
    assert.strictEqual(isNiceRace(race), true);
  });

  it('identifies Class 1 races with 8+ runners as nice races', () => {
    const race = {
      detail: 'Class 1 Stakes',
      horses: Array.from({ length: 8 }, (_, i) => ({ id: `horse-${i}` }))
    };
    assert.strictEqual(isNiceRace(race), true);
  });

  it('identifies Class 2 races with 8+ runners as nice races', () => {
    const race = {
      detail: 'Class 2 Conditions Stakes',
      horses: Array.from({ length: 12 }, (_, i) => ({ id: `horse-${i}` }))
    };
    assert.strictEqual(isNiceRace(race), true);
  });

  it('returns false for handicap or class 1/2 races with less than 8 runners', () => {
    const handicapSmall = {
      detail: 'Handicap (Class 3)',
      horses: Array.from({ length: 7 }, (_, i) => ({ id: `horse-${i}` }))
    };
    const class1Small = {
      detail: 'Class 1 Stakes',
      horses: Array.from({ length: 6 }, (_, i) => ({ id: `horse-${i}` }))
    };
    assert.strictEqual(isNiceRace(handicapSmall), false);
    assert.strictEqual(isNiceRace(class1Small), false);
  });

  it('returns false for non-handicap, non-class 1/2 races even with 8+ runners', () => {
    const maiden = {
      detail: 'Novice Stakes (Class 4)',
      horses: Array.from({ length: 14 }, (_, i) => ({ id: `horse-${i}` }))
    };
    assert.strictEqual(isNiceRace(maiden), false);
  });

  it('handles empty or null race safely', () => {
    assert.strictEqual(isNiceRace(null), false);
    assert.strictEqual(isNiceRace(undefined), false);
    assert.strictEqual(isNiceRace({}), false);
  });
});

describe('useStore batch alarm actions', () => {
  it('adds and removes alarms in batch properly', () => {
    useStore.getState().clearAlarms();
    assert.deepStrictEqual(useStore.getState().alarms, []);

    // Batch add alarms
    useStore.getState().addAlarms(['14:30Ascot', '15:00Newmarket', '15:30York']);
    assert.deepStrictEqual(useStore.getState().alarms, ['14:30Ascot', '15:00Newmarket', '15:30York']);

    // Avoid duplicate additions
    useStore.getState().addAlarms(['14:30Ascot', '16:00Haydock', '']);
    assert.deepStrictEqual(useStore.getState().alarms, ['14:30Ascot', '15:00Newmarket', '15:30York', '16:00Haydock']);

    // Batch remove alarms
    useStore.getState().removeAlarms(['15:00Newmarket', '16:00Haydock']);
    assert.deepStrictEqual(useStore.getState().alarms, ['14:30Ascot', '15:30York']);

    // Clear all alarms
    useStore.getState().clearAlarms();
    assert.deepStrictEqual(useStore.getState().alarms, []);
  });
});
