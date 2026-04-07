import { parse } from 'csv-parse/sync';
import { scrapeCurrentRankings, getCachedRankings } from './rankingScraper.js';
import { priceFromRank } from './pricing.js';

const RANKINGS_URL = 'https://raw.githubusercontent.com/JeffSackmann/tennis_atp/master/atp_rankings_current.csv';
const PLAYERS_URL = 'https://raw.githubusercontent.com/JeffSackmann/tennis_atp/master/atp_players.csv';
const WTA_RANKINGS_URL = 'https://raw.githubusercontent.com/JeffSackmann/tennis_wta/master/wta_rankings_current.csv';
const WTA_PLAYERS_URL = 'https://raw.githubusercontent.com/JeffSackmann/tennis_wta/master/wta_players.csv';

let cache = { players: [], lastFetch: null };

async function fetchCSV(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

function parsePlayerMap(csv) {
  // Columns: player_id, name_first, name_last, hand, dob, ioc, height, wikidata_id
  const rows = parse(csv, { columns: true, skip_empty_lines: true, relax_column_count: true });
  const map = new Map();
  for (const row of rows) {
    const id = (row.player_id || '').trim();
    if (!id) continue;
    map.set(id, {
      firstName: (row.name_first || '').trim(),
      lastName: (row.name_last || '').trim(),
      country: (row.ioc || '').trim(),
    });
  }
  return map;
}

function parseRankings(csv) {
  // Columns: ranking_date, rank, player, points
  const rows = parse(csv, { columns: true, skip_empty_lines: true, relax_column_count: true });
  // Find latest date
  let latestDate = '';
  for (const row of rows) {
    if (row.ranking_date > latestDate) latestDate = row.ranking_date;
  }
  return rows.filter(r => r.ranking_date === latestDate);
}

function buildPlayers(rankings, playerMap, tour, limit = 200) {
  const players = [];
  for (const row of rankings.slice(0, limit)) {
    const rank = parseInt(row.rank);
    const playerId = (row.player || '').trim();
    const points = parseInt(row.points) || 0;
    const info = playerMap.get(playerId);
    if (!info || !info.lastName) continue;

    players.push({
      id: `${tour.toLowerCase()}_${playerId}`,
      name: `${info.firstName} ${info.lastName}`.trim(),
      country: info.country,
      rank,
      tour,
      atpPoints: points,
      basePrice: priceFromRank(rank),
      currentPrice: priceFromRank(rank),
      fantasyPoints: 0,
      recentMatches: [],
    });
  }
  return players;
}

export async function seedPlayers(force = false) {
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  if (!force && cache.lastFetch && (now - cache.lastFetch) < ONE_DAY && cache.players.length > 0) {
    console.log('[Layer1] Using cached player data');
    return cache.players;
  }

  // Primary: scrape live 2026 rankings from ATP/WTA sites
  console.log('[Layer1] Fetching live rankings...');
  try {
    const { atp, wta } = await scrapeCurrentRankings(force);
    if (atp.length > 0) {
      const allPlayers = [...atp, ...wta];
      cache = { players: allPlayers, lastFetch: now };
      console.log(`[Layer1] Live rankings: ${atp.length} ATP + ${wta.length} WTA players`);
      return allPlayers;
    }
  } catch (err) {
    console.warn('[Layer1] Live ranking scrape failed:', err.message);
  }

  // Check if ranking scraper has cached data from a previous run
  const cached = getCachedRankings();
  if (cached.atp.length > 0) {
    const allPlayers = [...cached.atp, ...cached.wta];
    cache = { players: allPlayers, lastFetch: now };
    console.log(`[Layer1] Using cached scraped rankings: ${cached.atp.length} ATP + ${cached.wta.length} WTA`);
    return allPlayers;
  }

  // Fallback: Sackmann CSVs (2024 data — outdated but better than nothing)
  console.log('[Layer1] Falling back to Sackmann GitHub CSVs (2024 data)...');
  try {
    const [rankingsCSV, playersCSV] = await Promise.all([
      fetchCSV(RANKINGS_URL),
      fetchCSV(PLAYERS_URL),
    ]);

    const playerMap = parsePlayerMap(playersCSV);
    const rankings = parseRankings(rankingsCSV);
    const atpPlayers = buildPlayers(rankings, playerMap, 'ATP');

    let wtaPlayers = [];
    try {
      const [wtaRankCSV, wtaPlayersCSV] = await Promise.all([
        fetchCSV(WTA_RANKINGS_URL),
        fetchCSV(WTA_PLAYERS_URL),
      ]);
      const wtaPlayerMap = parsePlayerMap(wtaPlayersCSV);
      const wtaRankings = parseRankings(wtaRankCSV);
      wtaPlayers = buildPlayers(wtaRankings, wtaPlayerMap, 'WTA');
    } catch (err) {
      console.warn('[Layer1] WTA CSV fetch failed:', err.message);
    }

    const allPlayers = [...atpPlayers, ...wtaPlayers];
    cache = { players: allPlayers, lastFetch: now };
    console.log(`[Layer1] CSV fallback: ${atpPlayers.length} ATP + ${wtaPlayers.length} WTA (2024 data)`);
    return allPlayers;
  } catch (err) {
    console.error('[Layer1] All seeding methods failed:', err.message);
    if (cache.players.length > 0) return cache.players;
    return [];
  }
}

export function getCachedPlayers() {
  return cache.players;
}

export function updatePlayerInCache(playerId, updates) {
  const idx = cache.players.findIndex(p => p.id === playerId);
  if (idx !== -1) {
    cache.players[idx] = { ...cache.players[idx], ...updates };
  }
}
