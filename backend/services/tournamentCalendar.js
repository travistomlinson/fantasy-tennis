// 2026 ATP Fantasy Tennis Season Calendar
// 4 Swings, event-based tournament slots (April–November 2026)

const SWINGS = [
  {
    id: 'clay',
    name: 'Clay Season',
    startDate: '2026-04-05',
    endDate: '2026-06-07',
    tournaments: [
      { name: 'Rolex Monte Carlo Masters', category: 'masters1000', city: 'Monte-Carlo', startDate: '2026-04-05', endDate: '2026-04-12', aliases: ['MONTE CARLO', 'MONTE-CARLO'] },
      { name: 'Barcelona Open Banc Sabadell', category: 'atp500', city: 'Barcelona', startDate: '2026-04-13', endDate: '2026-04-19', aliases: ['BARCELONA'] },
      { name: 'Mutua Madrid Open', category: 'masters1000', city: 'Madrid', startDate: '2026-04-26', endDate: '2026-05-03', aliases: ['MADRID'] },
      { name: 'Internazionali BNL d\'Italia', category: 'masters1000', city: 'Rome', startDate: '2026-05-10', endDate: '2026-05-17', aliases: ['ROME', 'ROMA', 'ITALIAN OPEN'] },
      { name: 'Roland Garros', category: 'major', city: 'Paris', startDate: '2026-05-24', endDate: '2026-06-07', aliases: ['PARIS', 'FRENCH OPEN', 'ROLAND GARROS'] },
    ],
  },
  {
    id: 'grass',
    name: 'Grass Season',
    startDate: '2026-06-08',
    endDate: '2026-07-12',
    tournaments: [
      { name: 'BOSS Open', category: 'atp250', city: 'Stuttgart', startDate: '2026-06-08', endDate: '2026-06-14', aliases: ['STUTTGART'] },
      { name: 'Cinch Championships', category: 'atp500', city: 'London', startDate: '2026-06-15', endDate: '2026-06-21', aliases: ['QUEEN\'S', 'QUEENS', 'LONDON'] },
      { name: 'Terra Wortmann Open', category: 'atp500', city: 'Halle', startDate: '2026-06-15', endDate: '2026-06-21', aliases: ['HALLE'] },
      { name: 'Mallorca Championships', category: 'atp250', city: 'Mallorca', startDate: '2026-06-22', endDate: '2026-06-28', aliases: ['MALLORCA'] },
      { name: 'Eastbourne International', category: 'atp250', city: 'Eastbourne', startDate: '2026-06-22', endDate: '2026-06-28', aliases: ['EASTBOURNE'] },
      { name: 'Wimbledon', category: 'major', city: 'London', startDate: '2026-06-29', endDate: '2026-07-12', aliases: ['WIMBLEDON'] },
    ],
  },
  {
    id: 'na_hard',
    name: 'North American Hard Court',
    startDate: '2026-07-27',
    endDate: '2026-09-13',
    tournaments: [
      { name: 'Atlanta Open', category: 'atp250', city: 'Atlanta', startDate: '2026-07-27', endDate: '2026-08-02', aliases: ['ATLANTA'] },
      { name: 'National Bank Open', category: 'masters1000', city: 'Montreal', startDate: '2026-08-03', endDate: '2026-08-09', aliases: ['MONTREAL', 'CANADA', 'CANADIAN OPEN', 'TORONTO'] },
      { name: 'Cincinnati Open', category: 'masters1000', city: 'Cincinnati', startDate: '2026-08-10', endDate: '2026-08-16', aliases: ['CINCINNATI', 'WESTERN & SOUTHERN'] },
      { name: 'Winston-Salem Open', category: 'atp250', city: 'Winston-Salem', startDate: '2026-08-23', endDate: '2026-08-29', aliases: ['WINSTON-SALEM', 'WINSTON SALEM'] },
      { name: 'US Open', category: 'major', city: 'New York', startDate: '2026-08-31', endDate: '2026-09-13', aliases: ['US OPEN', 'NEW YORK', 'FLUSHING MEADOWS'] },
    ],
  },
  {
    id: 'race',
    name: 'Race To Nitto ATP Finals',
    startDate: '2026-09-23',
    endDate: '2026-11-08',
    tournaments: [
      { name: 'Chengdu Open', category: 'atp250', city: 'Chengdu', startDate: '2026-09-23', endDate: '2026-09-27', aliases: ['CHENGDU'] },
      { name: 'China Open', category: 'atp500', city: 'Beijing', startDate: '2026-09-28', endDate: '2026-10-04', aliases: ['BEIJING', 'CHINA OPEN'] },
      { name: 'Shanghai Masters', category: 'masters1000', city: 'Shanghai', startDate: '2026-10-05', endDate: '2026-10-12', aliases: ['SHANGHAI'] },
      { name: 'Erste Bank Open', category: 'atp500', city: 'Vienna', startDate: '2026-10-19', endDate: '2026-10-25', aliases: ['VIENNA'] },
      { name: 'Swiss Indoors', category: 'atp500', city: 'Basel', startDate: '2026-10-19', endDate: '2026-10-25', aliases: ['BASEL'] },
      { name: 'Rolex Paris Masters', category: 'masters1000', city: 'Paris', startDate: '2026-10-26', endDate: '2026-11-01', aliases: ['PARIS MASTERS', 'PARIS-BERCY', 'BERCY'] },
      { name: 'Nitto ATP Finals', category: 'atp500', city: 'Turin', startDate: '2026-11-02', endDate: '2026-11-08', aliases: ['ATP FINALS', 'TURIN', 'TORINO'] },
    ],
  },
];

// Build tournament event slots. Each unique (startDate, endDate) pair
// across a swing becomes one slot. Concurrent tournaments (e.g. Queen's
// + Halle) share a single slot. Each tournament appears exactly once.
function buildTournamentWeeks() {
  const slots = [];
  let slotNum = 1;

  for (const swing of SWINGS) {
    // Group tournaments that share the same date range into one slot
    const groups = new Map(); // key: "startDate|endDate" -> tournaments[]
    for (const t of swing.tournaments) {
      const key = `${t.startDate}|${t.endDate}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(t);
    }

    // Sort groups chronologically by start date
    const sorted = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    for (const [key, tournaments] of sorted) {
      const [startDate, endDate] = key.split('|');
      slots.push({
        week: slotNum,
        swing: swing.id,
        startDate,
        endDate,
        tournaments: tournaments.map(t => t.name),
      });
      slotNum++;
    }
  }

  return slots;
}

export const TOURNAMENT_WEEKS = buildTournamentWeeks();

// All tournaments flattened for lookup
const ALL_TOURNAMENTS = SWINGS.flatMap(s => s.tournaments);

// Build alias lookup map
const aliasMap = new Map();
for (const t of ALL_TOURNAMENTS) {
  aliasMap.set(t.name.toUpperCase(), t);
  if (t.aliases) {
    for (const alias of t.aliases) {
      aliasMap.set(alias.toUpperCase(), t);
    }
  }
}

export function getSwings() {
  return SWINGS;
}

export function getCurrentSwing(date = new Date()) {
  const d = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  return SWINGS.find(s => d >= s.startDate && d <= s.endDate) || null;
}

export function getTournamentWeek(date = new Date()) {
  const d = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  return TOURNAMENT_WEEKS.find(w => d >= w.startDate && d <= w.endDate) || null;
}

export function getTournamentsForWeek(weekNumber) {
  const week = TOURNAMENT_WEEKS.find(w => w.week === weekNumber);
  if (!week) return [];
  return week.tournaments.map(name =>
    ALL_TOURNAMENTS.find(t => t.name === name)
  ).filter(Boolean);
}

export function getTournamentCategory(tournamentName) {
  if (!tournamentName) return null;
  const upper = tournamentName.toUpperCase().trim();

  // Direct alias match
  const match = aliasMap.get(upper);
  if (match) return match.category;

  // Fuzzy: check if any alias is contained in the input
  for (const [alias, t] of aliasMap) {
    if (upper.includes(alias) || alias.includes(upper)) {
      return t.category;
    }
  }

  return null;
}

export function findTournament(tournamentName) {
  if (!tournamentName) return null;
  const upper = tournamentName.toUpperCase().trim();

  const match = aliasMap.get(upper);
  if (match) return match;

  for (const [alias, t] of aliasMap) {
    if (upper.includes(alias) || alias.includes(upper)) {
      return t;
    }
  }

  return null;
}
