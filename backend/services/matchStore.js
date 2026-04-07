import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORE_FILE = join(__dirname, '..', 'match-store.json');

// Structure: { "2026-04-06": { matches: [...], fetchedAt: timestamp, complete: bool }, ... }
let store = null;

function load() {
  if (store) return store;
  if (existsSync(STORE_FILE)) {
    try {
      store = JSON.parse(readFileSync(STORE_FILE, 'utf-8'));
      const dates = Object.keys(store);
      const totalMatches = dates.reduce((sum, d) => sum + (store[d].matches?.length || 0), 0);
      console.log(`[MatchStore] Loaded ${totalMatches} matches across ${dates.length} dates`);
      return store;
    } catch (e) {
      console.warn('[MatchStore] Failed to load:', e.message);
    }
  }
  store = {};
  return store;
}

function save() {
  writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
}

// Get stored matches for a date
export function getMatchesForDate(date) {
  load();
  return store[date] || null;
}

// Check if we have complete data for a date (all matches finished, stats fetched)
export function isDateComplete(date) {
  load();
  const entry = store[date];
  if (!entry) return false;
  return entry.complete === true;
}

// Save matches for a date
export function saveMatchesForDate(date, matches) {
  load();
  const allComplete = matches.length > 0 && matches.every(m => m.isComplete && !m.isLive);
  const withStats = matches.filter(m => m.homeAces !== null).length;
  const statsRatio = matches.length > 0 ? withStats / matches.length : 0;
  // Mark complete if all matches finished and >80% have stats
  const complete = allComplete && statsRatio > 0.8;

  store[date] = {
    matches,
    fetchedAt: Date.now(),
    complete,
    matchCount: matches.length,
    withStats,
  };
  save();
  console.log(`[MatchStore] Saved ${matches.length} matches for ${date} (complete: ${complete}, stats: ${withStats}/${matches.length})`);
}

// Merge new scrape results with existing stored matches for a date
// Keeps existing stats if new scrape is missing them (e.g. cached scrape without detail pages)
export function mergeMatches(date, newMatches) {
  load();
  const existing = store[date]?.matches || [];

  // Build lookup of existing matches by player pair
  const existingMap = new Map();
  for (const m of existing) {
    const key = normalizeMatchKey(m.homePlayer, m.awayPlayer);
    existingMap.set(key, m);
  }

  // Merge: prefer new data but keep old stats if new ones are null
  const merged = [];
  const seen = new Set();

  for (const m of newMatches) {
    const key = normalizeMatchKey(m.homePlayer, m.awayPlayer);
    seen.add(key);
    const old = existingMap.get(key);

    if (old) {
      merged.push({
        ...m,
        homeAces: m.homeAces ?? old.homeAces,
        awayAces: m.awayAces ?? old.awayAces,
        homeDFs: m.homeDFs ?? old.homeDFs,
        awayDFs: m.awayDFs ?? old.awayDFs,
        limitedData: (m.homeAces ?? old.homeAces) === null,
        matchId: old.matchId, // keep stable ID
      });
    } else {
      merged.push(m);
    }
  }

  // Keep old matches not in new scrape (they may have been scrolled off the page)
  for (const m of existing) {
    const key = normalizeMatchKey(m.homePlayer, m.awayPlayer);
    if (!seen.has(key)) merged.push(m);
  }

  saveMatchesForDate(date, merged);
  return merged;
}

function normalizeMatchKey(home, away) {
  return `${(home || '').toLowerCase().trim()}|${(away || '').toLowerCase().trim()}`;
}

// Get all stored dates
export function getStoredDates() {
  load();
  return Object.keys(store).sort().reverse();
}

// Get all matches across all dates
export function getAllMatches() {
  load();
  const all = [];
  for (const date of Object.keys(store)) {
    all.push(...(store[date].matches || []));
  }
  return all;
}

// Stats
export function getStoreStats() {
  load();
  const dates = Object.keys(store);
  const totalMatches = dates.reduce((sum, d) => sum + (store[d].matches?.length || 0), 0);
  const completeDates = dates.filter(d => store[d].complete);
  return { dates: dates.length, totalMatches, completeDates: completeDates.length };
}
