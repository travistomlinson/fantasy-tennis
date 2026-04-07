const BASE_URL = 'https://v1.tennis.api-sports.io';

let quotaRemaining = 100;
let matchCache = new Map(); // matchId -> { data, fetchedAt, status }

function getHeaders() {
  return {
    'x-apisports-key': process.env.API_SPORTS_KEY,
  };
}

export function getQuotaRemaining() {
  return quotaRemaining;
}

export function isQuotaExhausted() {
  return quotaRemaining <= 2; // keep a small buffer
}

async function apiRequest(endpoint) {
  if (isQuotaExhausted()) {
    console.log('[Layer2] API quota exhausted, skipping request');
    return null;
  }

  const url = `${BASE_URL}${endpoint}`;
  console.log(`[Layer2] API request: ${url}`);

  try {
    const res = await fetch(url, { headers: getHeaders() });
    const remaining = res.headers.get('x-ratelimit-remaining');
    if (remaining !== null) {
      quotaRemaining = parseInt(remaining);
      console.log(`[Layer2] Quota remaining: ${quotaRemaining}`);
    }

    if (!res.ok) {
      console.error(`[Layer2] API error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error(`[Layer2] API request failed: ${err.message}`);
    return null;
  }
}

export async function getLiveMatches() {
  const data = await apiRequest('/games?live=all');
  if (!data?.response) return [];

  for (const match of data.response) {
    matchCache.set(match.id, {
      data: match,
      fetchedAt: Date.now(),
      status: match.status?.short || 'unknown',
    });
  }

  return data.response;
}

export async function getMatchesByDate(date) {
  // date format: YYYY-MM-DD
  const data = await apiRequest(`/games?date=${date}`);
  if (!data?.response) return [];

  for (const match of data.response) {
    matchCache.set(match.id, {
      data: match,
      fetchedAt: Date.now(),
      status: match.status?.short || 'unknown',
    });
  }

  return data.response;
}

export async function getMatchDetail(matchId) {
  // Check cache first - only re-fetch if match was live
  const cached = matchCache.get(matchId);
  if (cached) {
    const isLive = ['NS', 'S1', 'S2', 'S3', 'S4', 'S5'].includes(cached.status);
    const age = Date.now() - cached.fetchedAt;
    if (!isLive || age < 5 * 60 * 1000) {
      console.log(`[Layer2] Using cached match ${matchId}`);
      return cached.data;
    }
  }

  const data = await apiRequest(`/games?id=${matchId}`);
  if (!data?.response?.[0]) return cached?.data || null;

  const match = data.response[0];
  matchCache.set(matchId, {
    data: match,
    fetchedAt: Date.now(),
    status: match.status?.short || 'unknown',
  });

  return match;
}

export function getCachedMatches() {
  return Array.from(matchCache.values()).map(c => c.data);
}

export function parseMatchForScoring(match) {
  if (!match) return null;

  const homePlayer = match.players?.home?.name || 'Unknown';
  const awayPlayer = match.players?.away?.name || 'Unknown';
  const homeSets = match.scores?.home || 0;
  const awaySets = match.scores?.away || 0;
  const winner = homeSets > awaySets ? 'home' : 'away';
  const isRetirement = match.status?.short === 'ABD' || match.status?.short === 'WO';

  // Parse individual set scores
  const sets = [];
  for (let i = 1; i <= 5; i++) {
    const setKey = `set_${i}`;
    if (match.scores?.[setKey]) {
      sets.push({
        home: match.scores[setKey].home,
        away: match.scores[setKey].away,
      });
    }
  }

  // Stats from API (may not always be available)
  const stats = match.statistics || {};
  const homeAces = stats.home?.aces ?? null;
  const awayAces = stats.away?.aces ?? null;
  const homeDFs = stats.home?.double_faults ?? null;
  const awayDFs = stats.away?.double_faults ?? null;

  return {
    matchId: match.id,
    homePlayer,
    awayPlayer,
    winner,
    winnerName: winner === 'home' ? homePlayer : awayPlayer,
    loserName: winner === 'home' ? awayPlayer : homePlayer,
    homeSets,
    awaySets,
    sets,
    isRetirement,
    isStraightSets: (homeSets === 2 && awaySets === 0) || (awaySets === 2 && homeSets === 0),
    homeAces,
    awayAces,
    homeDFs,
    awayDFs,
    dataSource: 'api',
    isComplete: ['FT', 'ABD', 'WO'].includes(match.status?.short),
    timestamp: match.date || new Date().toISOString(),
  };
}
