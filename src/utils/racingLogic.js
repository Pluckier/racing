export const HOT_OWNERS = [
  "John P McManus", "Mrs J Donnelly", "John P Mcmanus"
];

export const HOT_TRAINERS = [
  "A P O'Brien", "T D Easterby", "L Russell & M Scudamore",
  "W P Mullins", "G Elliott", "R Hannon", "G P Cromwell",
  "G & J Moore", "R A Fahey", "Ian Williams", "A W Carroll", "Aidan O'Brien",
  "K R Burke", "E Bolger", "James Owen", "J P O'Brien", "P Twomey",
  "D Skelton", "P F Nicholls", "A M Balding", "W J Haggas", "N P Mulholland",
  "J & T Gosden", "C Appleby", "R M Beckett", "C Johnston", "H De Bromhead",
  "Gavin Cromwell", "Charlie Johnston", "Ralph Beckett", "John & Thady Gosden",
  "Neil Mulholland", "Andrew Balding", "Tony Carroll", "Dan Skelton", "Richard Hannon",
  "Joseph Patrick O'Brien", "William Haggas", "Henry De Bromhead", "Gordon Elliott",
  "Lucinda Russell & Michael Scudamore", "Tim Easterby", "Richard & Peter Fahey",
  "Charlie Appleby", "Martin Keighley", "Ben Pauling", "Jonjo & A.J. O'Neill", "Clive Cox", "George Boughey"
];

export const HOT_FOALED = [];

export const HOT_JOCKEYS = [];

// Helper to parse a foaled string into its three components
const parseFoaledStr = (str) => {
  if (!str) return { dam: '', broodmareSire: '', sire: '' };
  const match = str.match(/D:\s*(.*?)\s*\((.*?)\)\s*S:\s*(.*)/i);
  return match
    ? { dam: match[1].trim(), broodmareSire: match[2].trim(), sire: match[3].trim() }
    : { dam: str.trim(), broodmareSire: '', sire: '' };
};

/**
 * Determines if a horse is a "Fiddle" based on connections and odds.
 * Respects bloodlineMode (or/and) and selected lineage arrays from the store.
 */
export const isFiddleHorse = (horse, activeTrainersList = null, activeJockeysList = null, activeOwnersList = null, activeFoaledList = null, bloodlineMode = 'or', selectedDams = null, selectedBroodmareSires = null, selectedSires = null) => {
  if (!horse) return false;
  const oddsArray = horse.odds || [];
  const latestOddRaw = oddsArray[oddsArray.length - 1];
  if (!latestOddRaw || latestOddRaw === "null" || latestOddRaw === "NR") return false;

  if (horse.owner?.startsWith("STAR")) return true;

  const currentOdds = parseFloat(latestOddRaw);
  if (isNaN(currentOdds) || currentOdds <= 1) return false;

  const owner = (horse.owner || "");
  const foaled = (horse.foaled || "");
  const trainer = (horse.trainer || "");
  const jockey = (horse.jockey || "");

  const trainersToUse = activeTrainersList !== null ? activeTrainersList : HOT_TRAINERS;
  const jockeysToUse = activeJockeysList !== null ? activeJockeysList : HOT_JOCKEYS;
  const ownersToUse = activeOwnersList !== null ? activeOwnersList : HOT_OWNERS;
  const foaledToUse = activeFoaledList !== null ? activeFoaledList : HOT_FOALED;

  // bloodlineMode and lineage arrays are now passed as parameters

  let foaledMatch = false;

  if (bloodlineMode === 'and') {
    // AND mode: parse the horse's foaled into components, then require
    // every category that has selections to be satisfied
    const parsed = parseFoaledStr(foaled);
    const hasDamSel = selectedDams && selectedDams.length > 0;
    const hasBMSel = selectedBroodmareSires && selectedBroodmareSires.length > 0;
    const hasSireSel = selectedSires && selectedSires.length > 0;

    if (hasDamSel || hasBMSel || hasSireSel) {
      const damOk = !hasDamSel || selectedDams.includes(parsed.dam);
      const bmsOk = !hasBMSel || selectedBroodmareSires.includes(parsed.broodmareSire);
      const sireOk = !hasSireSel || selectedSires.includes(parsed.sire);
      foaledMatch = damOk && bmsOk && sireOk;
    }
  } else {
    // OR mode (default): existing behaviour — match full foaled strings
    foaledMatch = foaledToUse.some(f => foaled.includes(f));
  }

  return ownersToUse.some(o => owner.toLowerCase().replace(/\./g, "").includes(o.toLowerCase().replace(/\./g, ""))) ||
    trainersToUse.some(t => trainer.toLowerCase().replace(/\./g, "").includes(t.toLowerCase().replace(/\./g, ""))) ||
    jockeysToUse.some(j => jockey.toLowerCase().replace(/\./g, "").includes(j.toLowerCase().replace(/\./g, ""))) ||
    foaledMatch;
};

/**
 * Injects 'isValue' and 'isFiddle' flags into horse objects within a race.
 * NOW ACCEPTS aiMode AS A SECOND PARAMETER
 */
export const augmentRaceWithStats = (race, aiMode = 0, activeTrainersList = null, activeJockeysList = null, activeOwnersList = null, activeFoaledList = null, bloodlineMode = 'or', selectedDams = null, selectedBroodmareSires = null, selectedSires = null) => {
  const formMatch = race.detail?.match(/FORM\s+(\d+)%/i);
  const formPercentage = formMatch ? parseInt(formMatch[1], 10) : 0;

  const activeHorses = (race.horses || []).filter(h => {
    const lastOdd = h.odds?.[h.odds.length - 1];
    return lastOdd && lastOdd !== "null" && lastOdd !== "NR";
  });

  const ratingsPool = activeHorses.map(h => {
    const pr = (h.past || []).map(p => {
      // Safely map values based on the passed-in aiMode numerical state
      const targetName = aiMode === 2 ? p.name2AI : aiMode === 1 ? p.nameAI : p.name;
      return parseFloat(targetName);
    }).filter(n => !isNaN(n));

    return pr.length > 0 ? Math.max(...pr) : 0;
  });

  const uniqueRatings = [...new Set(ratingsPool)].sort((a, b) => b - a);
  const [top1 = 0, top2 = 0] = uniqueRatings;

  return {
    ...race,
    horses: (race.horses || []).map(h => {
      const lastOdd = h.odds?.[h.odds.length - 1];
      const currentOdds = (lastOdd && lastOdd !== "null" && lastOdd !== "NR") ? parseFloat(lastOdd) : 0;

      const pr = (h.past || []).map(p => {
        const targetName = aiMode === 2 ? p.name2AI : aiMode === 1 ? p.nameAI : p.name;
        return parseFloat(targetName);
      }).filter(n => !isNaN(n));

      const maxRating = pr.length > 0 ? Math.max(...pr) : 0;

      const isValue = maxRating > 0 && (maxRating === top1 || maxRating === top2) && currentOdds > 1;

      return {
        ...h,
        isFiddle: isFiddleHorse(h, activeTrainersList, activeJockeysList, activeOwnersList, activeFoaledList, bloodlineMode, selectedDams, selectedBroodmareSires, selectedSires),
        isValue: isValue
      };
    })
  };
};
