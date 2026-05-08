export const HOT_OWNERS = [
  "John P McManus", "Mrs J Donnelly"
];
export const HOT_TRAINERS = [
  "A P O'Brien", "T D Easterby", "L Russell & M Scudamore",
  "W P Mullins", "G Elliott", "R Hannon", "G P Cromwell",
  "G & J Moore", "R A Fahey", "Ian Williams", "A W Carroll",
  "K R Burke"
];

/**
 * Determines if a horse is a "Fiddle" based on connections and odds.
 */
export const isFiddleHorse = (horse) => {
  if (!horse) return false;
  const oddsArray = horse.odds || [];
  const latestOddRaw = oddsArray[oddsArray.length - 1];
  if (!latestOddRaw || latestOddRaw === "null" || latestOddRaw === "NR") return false;
  
  if (horse.owner?.startsWith("STAR")) return true;
  
  const currentOdds = parseFloat(latestOddRaw);
  if (isNaN(currentOdds) || currentOdds <= 1) return false;

  const owner = (horse.owner || "").toLowerCase();
  const trainer = (horse.trainer || "").toLowerCase();
  return HOT_OWNERS.some(o => owner.includes(o.toLowerCase())) ||
         HOT_TRAINERS.some(t => trainer.includes(t.toLowerCase()));
};

/**
 * Injects 'isValue' and 'isFiddle' flags into horse objects within a race.
 */
export const augmentRaceWithStats = (race) => {
  const formMatch = race.detail?.match(/FORM\s+(\d+)%/i);
  const formPercentage = formMatch ? parseInt(formMatch[1], 10) : 0;
  
  const activeHorses = (race.horses || []).filter(h => {
    const lastOdd = h.odds?.[h.odds.length - 1];
    return lastOdd && lastOdd !== "null" && lastOdd !== "NR";
  });

  const ratingsPool = activeHorses.map(h => {
    const pr = (h.past || []).map(p => parseFloat(p.name)).filter(n => !isNaN(n));
    return pr.length > 0 ? Math.max(...pr) : 0;
  });

  const uniqueRatings = [...new Set(ratingsPool)].sort((a, b) => b - a);
  const [top1 = 0, top2 = 0] = uniqueRatings;

  return {
    ...race,
    horses: (race.horses || []).map(h => {
      const lastOdd = h.odds?.[h.odds.length - 1];
      const currentOdds = (lastOdd && lastOdd !== "null" && lastOdd !== "NR") ? parseFloat(lastOdd) : 0;
      const pr = (h.past || []).map(p => parseFloat(p.name)).filter(n => !isNaN(n));
      const maxRating = pr.length > 0 ? Math.max(...pr) : 0;
      
      const isValue = formPercentage >= 70 && maxRating > 0 && (maxRating === top1 || maxRating === top2) && currentOdds > 9;
      
      return {
        ...h,
        isFiddle: isFiddleHorse(h),
        isValue: isValue
      };
    })
  };
};
