import { Router } from 'express';
import { seedPlayers, getCachedPlayers } from '../services/playerSeeding.js';
import { getLiveMatches, getMatchesByDate, getQuotaRemaining, isQuotaExhausted, getCachedMatches, parseMatchForScoring } from '../services/apiSports.js';
import { scrapeRecentMatches } from '../services/scraper.js';
import { getMatchesForDate, isDateComplete, mergeMatches, saveMatchesForDate, getStoreStats, getStoredDates, getAllMatches } from '../services/matchStore.js';
import { calculateMatchPoints, recalculateWeeklyScores } from '../services/scoringEngine.js';
import {
  getState, initializeLeague, buyPlayer, sellPlayer,
  toggleBench, advanceWeek, applyWeeklyScores,
  saveState, getWeekSnapshot, getAvailableWeeks,
} from '../services/leagueState.js';
import { getAllImages, getImageUrl, downloadImages, scrapeImagesForPlayers, getStats as getImageStats } from '../services/playerImages.js';
import { getSwings, getCurrentSwing, getTournamentWeek, getTournamentsForWeek, TOURNAMENT_WEEKS } from '../services/tournamentCalendar.js';

const router = Router();

// --- Players ---

router.get('/players', async (req, res) => {
  let players = getCachedPlayers();
  if (players.length === 0) {
    players = await seedPlayers();
  }
  const { tour, search } = req.query;
  let filtered = players;
  if (tour) filtered = filtered.filter(p => p.tour === tour.toUpperCase());
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
  }
  res.json(filtered);
});

router.post('/players/refresh', async (req, res) => {
  const players = await seedPlayers(true);
  res.json({ count: players.length });
});

// --- League ---

router.get('/league', (req, res) => {
  res.json(getState());
});

router.post('/league/init', async (req, res) => {
  const players = getCachedPlayers().length > 0 ? getCachedPlayers() : await seedPlayers();
  const state = initializeLeague(players);
  res.json(state);
});

// --- Manager actions ---

router.post('/manager/:id/buy', (req, res) => {
  const { player } = req.body;
  const result = buyPlayer(req.params.id, player);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

router.post('/manager/:id/sell', (req, res) => {
  const { playerId } = req.body;
  const result = sellPlayer(req.params.id, playerId);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

router.post('/manager/:id/toggle-bench', (req, res) => {
  const { playerId } = req.body;
  const result = toggleBench(req.params.id, playerId);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// --- Matches ---

router.get('/matches/live', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  return serveMatches(today, res, true);
});

router.get('/matches/date/:date', async (req, res) => {
  return serveMatches(req.params.date, res, false);
});

// Shared logic for serving matches with store-first strategy
async function serveMatches(date, res, isLive) {
  // 1. Always check store first — serve immediately if we have data
  const stored = getMatchesForDate(date);
  if (stored && stored.matches.length > 0) {
    const age = Date.now() - stored.fetchedAt;
    const ONE_HOUR = 60 * 60 * 1000;
    const isStale = age > ONE_HOUR;
    const isComplete = isDateComplete(date);

    // Serve stored data immediately
    if (isComplete || !isStale) {
      console.log(`[Matches] Serving ${stored.matches.length} stored matches for ${date} (complete: ${isComplete}, age: ${Math.round(age / 60000)}m)`);
      res.json({ matches: stored.matches, source: 'stored', quotaRemaining: getQuotaRemaining() });
      return;
    }

    // Stale + incomplete: serve stored but also note it's stale
    console.log(`[Matches] Serving stale stored data for ${date}, consider refreshing`);
    res.json({ matches: stored.matches, source: 'stored-stale', quotaRemaining: getQuotaRemaining() });
    return;
  }

  // 2. No stored data — fetch fresh
  let matches = [];
  let source = 'none';

  // Try API
  if (!isQuotaExhausted()) {
    if (isLive) {
      matches = await getLiveMatches();
    } else {
      const raw = await getMatchesByDate(date);
      matches = raw.map(parseMatchForScoring).filter(Boolean);
    }
    if (matches.length > 0) source = 'api';
  }

  // Fall back to scraper
  if (matches.length === 0) {
    try {
      console.log('[Matches] No data, trying scraper fallback...');
      matches = await scrapeRecentMatches();
      if (matches.length > 0) source = 'scraped';
    } catch (e) {
      console.error('[Matches] Scraper also failed:', e.message);
    }
  }

  // Persist to store
  if (matches.length > 0) {
    mergeMatches(date, matches);
  }

  res.json({ matches, source, quotaRemaining: getQuotaRemaining() });
}

// Force re-scrape a date (used when you want to refresh stale data)
router.post('/matches/refresh/:date', async (req, res) => {
  const date = req.params.date;
  let matches = [];
  let source = 'none';

  try {
    matches = await scrapeRecentMatches();
    if (matches.length > 0) {
      source = 'scraped';
      mergeMatches(date, matches);
    }
  } catch (e) {
    console.error('[Matches] Refresh scrape failed:', e.message);
  }

  const state = getState();
  res.json({ matches, source, quotaRemaining: getQuotaRemaining() });
});

router.get('/matches/cached', (req, res) => {
  // Serve all stored matches across all dates
  const allStored = getAllMatches();
  const apiMatches = getCachedMatches().map(parseMatchForScoring).filter(Boolean);

  // Dedupe by matchId
  const seen = new Set();
  const combined = [];
  for (const m of [...allStored, ...apiMatches]) {
    if (!seen.has(m.matchId)) {
      seen.add(m.matchId);
      combined.push(m);
    }
  }
  res.json({ matches: combined });
});

router.get('/matches/store-stats', (req, res) => {
  res.json(getStoreStats());
});

router.get('/matches/stored-dates', (req, res) => {
  res.json(getStoredDates());
});

// --- Admin ---

router.post('/admin/advance-week', (req, res) => {
  const state = advanceWeek();
  res.json(state);
});

router.post('/admin/recalculate', async (req, res) => {
  const state = getState();
  const apiMatches = getCachedMatches().map(parseMatchForScoring).filter(Boolean);
  const allMatches = apiMatches;

  const results = recalculateWeeklyScores(state, allMatches);
  const updated = applyWeeklyScores(results, allMatches);

  res.json({ state: updated, results });
});

router.get('/admin/quota', (req, res) => {
  res.json({ quotaRemaining: getQuotaRemaining(), isExhausted: isQuotaExhausted() });
});

// --- History ---

router.get('/history/weeks', (req, res) => {
  res.json(getAvailableWeeks());
});

router.get('/history/week/:week', (req, res) => {
  const snapshot = getWeekSnapshot(req.params.week);
  if (!snapshot) return res.status(404).json({ error: 'No data for that week' });
  res.json(snapshot);
});

router.post('/admin/update-name', (req, res) => {
  const { managerId, name } = req.body;
  const state = getState();
  const manager = state.managers.find(m => m.id === managerId);
  if (!manager) return res.status(404).json({ error: 'Manager not found' });
  manager.name = name;
  saveState();
  res.json(manager);
});

// --- Player Images ---

router.get('/images/all', (req, res) => {
  res.json(getAllImages());
});

router.get('/images/stats', (req, res) => {
  res.json(getImageStats());
});

router.post('/images/download', async (req, res) => {
  const count = await downloadImages();
  res.json({ downloaded: count, ...getImageStats() });
});

// Scrape images for all players from Flashscore search
router.post('/images/scrape-all', async (req, res) => {
  try {
    const players = getCachedPlayers();
    const names = players.map(p => p.name);
    const count = await scrapeImagesForPlayers(names);
    res.json({ scraped: count, ...getImageStats() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Tournaments ---

router.get('/tournaments/calendar', (req, res) => {
  res.json({ swings: getSwings(), weeks: TOURNAMENT_WEEKS });
});

router.get('/tournaments/current', (req, res) => {
  const now = new Date().toISOString().split('T')[0];
  res.json({
    swing: getCurrentSwing(now),
    week: getTournamentWeek(now),
    tournaments: (() => {
      const w = getTournamentWeek(now);
      return w ? getTournamentsForWeek(w.week) : [];
    })(),
  });
});

router.get('/tournaments/week/:week', (req, res) => {
  const weekNum = parseInt(req.params.week);
  const week = TOURNAMENT_WEEKS.find(w => w.week === weekNum);
  if (!week) return res.status(404).json({ error: 'Week not found' });
  res.json({ ...week, tournaments: getTournamentsForWeek(weekNum) });
});

export default router;
