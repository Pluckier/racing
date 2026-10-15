export function shouldShowFiddle(horse, highlightFiddles) {
  return !!highlightFiddles && !!horse?.isFiddle;
}

export function computeValueIndicator(horse, rank, highlightValues) {
  if (!highlightValues) return null;
  if (horse?.isValue && highlightValues === true) return 'massive';
  if (typeof rank === 'number' && rank >= 1) {
    if (rank === 1) return 'top';
    if (rank === 2) return 'second';
    if (rank === 3) return 'third';
    return String(rank);
  }
  return null;
}

export function shouldShowSelect(horse, selectHorseNumber, highlightSelects) {
  if (!highlightSelects) return false;
  const horseId = horse?.number === 'NR' ? horse?.name : String(horse?.number);
  return horseId && String(selectHorseNumber) === String(horseId);
}
