import { useStore } from '../store/alarmStore'; // You can delete this import line entirely if it's not used anywhere else in this file

export const HOT_OWNERS = [
  "John P McManus", "Mrs J Donnelly"
];

export const HOT_TRAINERS = [
  "A P O'Brien", "T D Easterby", "L Russell & M Scudamore",
  "W P Mullins", "G Elliott", "R Hannon", "G P Cromwell",
  "G & J Moore", "R A Fahey", "Ian Williams", "A W Carroll",
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

/**
 * Determines if a horse is a "Fiddle" based on connections and odds.
 */
export const isFiddleHorse = (horse, activeTrainersList = null, activeJockeysList = null) => {
  if (!horse) return false;
  const oddsArray = horse.odds || [];
  const latestOddRaw = oddsArray[oddsArray.length - 1];
  if (!latestOddRaw || latestOddRaw === "null" || latestOddRaw === "NR") return false;

  if (horse.owner?.startsWith("STAR")) return true;

  const currentOdds = parseFloat(latestOddRaw);
  if (isNaN(currentOdds) || currentOdds <= 1) return false;

  const owner = (horse.owner || "");
  const trainer = (horse.trainer || "");
  const jockey = (horse.jockey || "");

  const trainersToUse = activeTrainersList !== null ? activeTrainersList : HOT_TRAINERS;
  const jockeysToUse = activeJockeysList !== null ? activeJockeysList : HOT_JOCKEYS;

  return HOT_OWNERS.some(o => owner.includes(o)) ||
    trainersToUse.some(t => trainer.includes(t)) ||
    jockeysToUse.some(j => jockey.includes(j));
};

/**
 * Injects 'isValue' and 'isFiddle' flags into horse objects within a race.
 * NOW ACCEPTS aiMode AS A SECOND PARAMETER
 */
export const augmentRaceWithStats = (race, aiMode = 0, activeTrainersList = null, activeJockeysList = null) => {
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
        isFiddle: isFiddleHorse(h, activeTrainersList, activeJockeysList),
        isValue: isValue
      };
    })
  };
};
