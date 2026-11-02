import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getAnnouncedPlacesCount, formatRaceResult } from '../src/utils/racingLogic.js';

describe('Simulator result announcements', () => {
  it('announces only the winner for 4 runners or less', () => {
    assert.strictEqual(getAnnouncedPlacesCount(1), 1);
    assert.strictEqual(getAnnouncedPlacesCount(2), 1);
    assert.strictEqual(getAnnouncedPlacesCount(3), 1);
    assert.strictEqual(getAnnouncedPlacesCount(4), 1);
  });

  it('announces 1st and 2nd for less than 8 runners (5 to 7 runners)', () => {
    assert.strictEqual(getAnnouncedPlacesCount(5), 2);
    assert.strictEqual(getAnnouncedPlacesCount(6), 2);
    assert.strictEqual(getAnnouncedPlacesCount(7), 2);
  });

  it('announces 1st, 2nd, and 3rd for more than 7 runners up to 15 runners', () => {
    assert.strictEqual(getAnnouncedPlacesCount(8), 3);
    assert.strictEqual(getAnnouncedPlacesCount(12), 3);
    assert.strictEqual(getAnnouncedPlacesCount(15), 3);
  });

  it('announces 1st, 2nd, 3rd, and 4th only when >15 runners and detail contains handicap', () => {
    // 16+ runners with handicap
    assert.strictEqual(getAnnouncedPlacesCount(16, 'Class 4 Handicap Chase'), 4);
    assert.strictEqual(getAnnouncedPlacesCount(19, 'HANDICAP HURDLE (0-100)'), 4);
    assert.strictEqual(getAnnouncedPlacesCount(24, 'Heritage Handicap'), 4);

    // 16+ runners without handicap (e.g. Maiden, Stakes, Novice) -> only 3 places
    assert.strictEqual(getAnnouncedPlacesCount(16, 'Maiden Stakes'), 3);
    assert.strictEqual(getAnnouncedPlacesCount(19, 'Novice Hurdle'), 3);
    assert.strictEqual(getAnnouncedPlacesCount(20, 'Conditions Stakes'), 3);
  });

  it('formats single winner correctly for 3 runners', () => {
    const standings = [
      { number: 1, name: 'The Magus', latestOdds: '3.8' },
      { number: 2, name: 'I Love You Sivola', latestOdds: '2.1' },
      { number: 3, name: 'Bahtiyar', latestOdds: '3.15' }
    ];
    const res = formatRaceResult(standings, 'Handicap Chase');
    assert.strictEqual(res, 'RESULT: 1st #1 The Magus (3.8)');
  });

  it('formats 1st and 2nd correctly for 6 runners', () => {
    const standings = [
      { number: 2, name: 'Alpha', latestOdds: '2.0' },
      { number: 5, name: 'Beta', latestOdds: '4.5' },
      { number: 1, name: 'Gamma', latestOdds: '6.0' },
      { number: 3, name: 'Delta', latestOdds: '8.0' },
      { number: 4, name: 'Epsilon', latestOdds: '12.0' },
      { number: 6, name: 'Zeta', latestOdds: '20.0' }
    ];
    const res = formatRaceResult(standings, 'Novice Chase');
    assert.strictEqual(res, 'RESULT: 1st #2 Alpha (2.0) • 2nd #5 Beta (4.5)');
  });

  it('formats 1st, 2nd, 3rd, and 4th correctly for 16+ runners in a handicap', () => {
    const standings = Array.from({ length: 18 }, (_, i) => ({
      number: i + 1,
      name: `Horse ${i + 1}`,
      latestOdds: `${i + 2}.0`
    }));
    const res = formatRaceResult(standings, 'William Hill Challenge Series Handicap Hurdle');
    assert.strictEqual(
      res,
      'RESULT: 1st #1 Horse 1 (2.0) • 2nd #2 Horse 2 (3.0) • 3rd #3 Horse 3 (4.0) • 4th #4 Horse 4 (5.0)'
    );
  });
});
