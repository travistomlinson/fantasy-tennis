import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(__dirname, '..', 'league-state.json');

const FAKE_MANAGERS = [
  { name: 'Ace Ventura FC', id: 'bot_1' },
  { name: 'Net Gains', id: 'bot_2' },
  { name: 'Deuce Bigalow', id: 'bot_3' },
];

let state = null;

function defaultState() {
  return {
    currentWeek: 1,
    managers: [],
    manualMatches: [],
    weeklyResults: {},
    weeklySnapshots: {},  // week -> { matches, rosters, standings, timestamp }
    lastUpdated: new Date().toISOString(),
  };
}

export function getState() {
  if (state) return state;

  if (existsSync(STATE_FILE)) {
    try {
      state = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
      console.log('[State] Loaded from disk');
      return state;
    } catch (e) {
      console.warn('[State] Failed to load from disk:', e.message);
    }
  }

  state = defaultState();
  return state;
}

export function saveState() {
  if (!state) return;
  state.lastUpdated = new Date().toISOString();
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function initializeLeague(players) {
  state = getState();

  // Create user manager if not exists
  if (!state.managers.find(m => m.id === 'user')) {
    state.managers.push({
      id: 'user',
      name: 'My Team',
      coins: 100,
      totalPoints: 0,
      weeklyPoints: 0,
      roster: [],
      isBot: false,
    });
  }

  // Create bot managers if not exist
  for (const bot of FAKE_MANAGERS) {
    if (state.managers.find(m => m.id === bot.id)) continue;

    const roster = buildRandomRoster(players, 8);
    const totalCost = roster.reduce((sum, p) => sum + p.player.currentPrice, 0);

    state.managers.push({
      id: bot.id,
      name: bot.name,
      coins: Math.max(0, 100 - totalCost),
      totalPoints: Math.floor(Math.random() * 50) + 10, // seed some points
      weeklyPoints: Math.floor(Math.random() * 20),
      roster,
      isBot: true,
    });
  }

  saveState();
  return state;
}

function buildRandomRoster(players, count) {
  if (players.length === 0) return [];

  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const affordable = shuffled.filter(p => p.currentPrice <= 20);
  const picked = affordable.slice(0, count);

  return picked.map((p, i) => ({
    player: { ...p },
    benched: i >= 6, // first 6 active, last 2 benched
    acquiredWeek: 1,
  }));
}

export function buyPlayer(managerId, player) {
  const manager = state.managers.find(m => m.id === managerId);
  if (!manager) return { error: 'Manager not found' };
  if (manager.roster.length >= 8) return { error: 'Roster full (max 8)' };
  if (manager.coins < player.currentPrice) return { error: 'Not enough coins' };

  manager.coins -= player.currentPrice;
  const benched = manager.roster.filter(r => !r.benched).length >= 6;
  manager.roster.push({
    player: { ...player },
    benched,
    acquiredWeek: state.currentWeek,
  });

  saveState();
  return { success: true, manager };
}

export function sellPlayer(managerId, playerId) {
  const manager = state.managers.find(m => m.id === managerId);
  if (!manager) return { error: 'Manager not found' };

  const idx = manager.roster.findIndex(r => r.player.id === playerId);
  if (idx === -1) return { error: 'Player not on roster' };

  const slot = manager.roster[idx];
  manager.coins += slot.player.currentPrice;
  manager.roster.splice(idx, 1);

  saveState();
  return { success: true, manager };
}

export function toggleBench(managerId, playerId) {
  const manager = state.managers.find(m => m.id === managerId);
  if (!manager) return { error: 'Manager not found' };

  const slot = manager.roster.find(r => r.player.id === playerId);
  if (!slot) return { error: 'Player not on roster' };

  const activeCount = manager.roster.filter(r => !r.benched).length;

  if (slot.benched) {
    // Unbenching - check we don't exceed 6 active
    if (activeCount >= 6) return { error: 'Already have 6 active players. Bench someone first.' };
    slot.benched = false;
  } else {
    slot.benched = true;
  }

  saveState();
  return { success: true, manager };
}

export function advanceWeek() {
  state.currentWeek++;
  // Reset weekly points
  for (const manager of state.managers) {
    manager.weeklyPoints = 0;
  }
  saveState();
  return state;
}

export function applyWeeklyScores(results, matches = []) {
  for (const [managerId, result] of Object.entries(results)) {
    const manager = state.managers.find(m => m.id === managerId);
    if (!manager) continue;
    manager.weeklyPoints = result.weeklyPoints;
    manager.totalPoints += result.weeklyPoints;
  }

  state.weeklyResults[state.currentWeek] = results;

  // Snapshot this week's full state for historical viewing
  if (!state.weeklySnapshots) state.weeklySnapshots = {};
  state.weeklySnapshots[state.currentWeek] = {
    matches,
    rosters: state.managers.map(m => ({
      id: m.id,
      name: m.name,
      coins: m.coins,
      totalPoints: m.totalPoints,
      weeklyPoints: m.weeklyPoints,
      roster: m.roster.map(r => ({
        player: { ...r.player },
        benched: r.benched,
      })),
    })),
    standings: state.managers
      .map(m => ({ id: m.id, name: m.name, totalPoints: m.totalPoints, weeklyPoints: m.weeklyPoints }))
      .sort((a, b) => b.totalPoints - a.totalPoints),
    timestamp: new Date().toISOString(),
  };

  saveState();
  return state;
}

export function getWeekSnapshot(week) {
  if (!state.weeklySnapshots) return null;
  const snapshot = state.weeklySnapshots[week];
  if (!snapshot) return null;
  return {
    week: parseInt(week),
    ...snapshot,
    scores: state.weeklyResults?.[week] || {},
  };
}

export function getAvailableWeeks() {
  if (!state.weeklySnapshots) return [];
  return Object.keys(state.weeklySnapshots)
    .map(Number)
    .sort((a, b) => b - a);
}



