import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getRaceAlarmId, checkRaceAlarmStatus } from '../src/hooks/useAlarms.js';
import { parseRaceHash, findUpcomingRaceIndex } from '../src/hooks/useHashSync.js';
import { speakRace } from '../src/hooks/useAudioAlarms.js';

describe('useAlarms helpers', () => {
  it('formats race alarm id correctly', () => {
    const race = { time: '14:30', place: 'Newmarket Rowley' };
    assert.strictEqual(getRaceAlarmId(race), '14:30NewmarketRowley');
  });

  it('handles empty or missing race fields safely', () => {
    assert.strictEqual(getRaceAlarmId(null), '');
    assert.strictEqual(getRaceAlarmId({}), '');
  });

  it('checks race alarm status correctly based on time window', () => {
    const race = { time: '14:30', place: 'Ascot' };

    // 14:27 is 3 minutes before race -> within the 4-minute trigger window
    const triggerNow = new Date();
    triggerNow.setHours(14, 27, 0, 0);
    assert.strictEqual(checkRaceAlarmStatus(race, triggerNow), 'TRIGGER');

    // 14:20 is 10 minutes before race -> WAIT
    const waitNow = new Date();
    waitNow.setHours(14, 20, 0, 0);
    assert.strictEqual(checkRaceAlarmStatus(race, waitNow), 'WAIT');

    // 14:35 is past race time -> EXPIRED
    const expiredNow = new Date();
    expiredNow.setHours(14, 35, 0, 0);
    assert.strictEqual(checkRaceAlarmStatus(race, expiredNow), 'EXPIRED');
  });
});

describe('useHashSync helpers', () => {
  it('parses race hash with date and raceId', () => {
    const result = parseRaceHash('#2026-10-15@14:30Ascot');
    assert.deepStrictEqual(result, {
      datePart: '2026-10-15',
      raceId: '14:30Ascot'
    });
  });

  it('parses race hash without date prefix', () => {
    const result = parseRaceHash('#14:30Ascot');
    assert.deepStrictEqual(result, {
      datePart: null,
      raceId: '14:30Ascot'
    });
  });

  it('handles empty or null hash gracefully', () => {
    assert.deepStrictEqual(parseRaceHash(''), {
      datePart: null,
      raceId: ''
    });
  });

  it('finds next upcoming race based on current time', () => {
    const races = [
      { time: '13:30', place: 'Ascot' },
      { time: '14:00', place: 'Ascot' },
      { time: '14:30', place: 'Ascot' },
      { time: '15:00', place: 'Ascot' }
    ];

    const now = new Date();
    now.setHours(14, 15, 0, 0);

    const upcomingIdx = findUpcomingRaceIndex(races, now);
    assert.strictEqual(upcomingIdx, 2); // 14:30 is next
  });

  it('falls back to 0 when no races match or are upcoming', () => {
    assert.strictEqual(findUpcomingRaceIndex([]), 0);

    const pastRaces = [
      { time: '12:00', place: 'Ascot' },
      { time: '13:00', place: 'Ascot' }
    ];
    const lateNow = new Date();
    lateNow.setHours(16, 0, 0, 0);
    assert.strictEqual(findUpcomingRaceIndex(pastRaces, lateNow), 0);
  });
});

describe('useAudioAlarms helpers', () => {
  it('handles speakRace safely in non-browser / mock environment', () => {
    // In node environment, window or speechSynthesis is undefined
    assert.doesNotThrow(() => {
      speakRace('14:30', 'Ascot');
    });
  });
});
