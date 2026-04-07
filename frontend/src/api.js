const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// Players
export const getPlayers = (tour, search) => {
  const params = new URLSearchParams();
  if (tour) params.set('tour', tour);
  if (search) params.set('search', search);
  return request(`/players?${params}`);
};

// League
export const getLeague = () => request('/league');
export const initLeague = () => request('/league/init', { method: 'POST' });

// Manager
export const buyPlayer = (managerId, player) =>
  request(`/manager/${managerId}/buy`, { method: 'POST', body: JSON.stringify({ player }) });
export const sellPlayer = (managerId, playerId) =>
  request(`/manager/${managerId}/sell`, { method: 'POST', body: JSON.stringify({ playerId }) });
export const toggleBench = (managerId, playerId) =>
  request(`/manager/${managerId}/toggle-bench`, { method: 'POST', body: JSON.stringify({ playerId }) });

// Matches
export const getLiveMatches = () => request('/matches/live');
export const getMatchesByDate = (date) => request(`/matches/date/${date}`);
export const getCachedMatches = () => request('/matches/cached');

// Admin
export const advanceWeek = () => request('/admin/advance-week', { method: 'POST' });
export const recalculate = () => request('/admin/recalculate', { method: 'POST' });
export const getQuota = () => request('/admin/quota');
export const updateManagerName = (managerId, name) =>
  request('/admin/update-name', { method: 'POST', body: JSON.stringify({ managerId, name }) });

// History
export const getAvailableWeeks = () => request('/history/weeks');
export const getWeekSnapshot = (week) => request(`/history/week/${week}`);

// Tournaments
export const getTournamentCalendar = () => request('/tournaments/calendar');
export const getCurrentTournament = () => request('/tournaments/current');
export const getTournamentWeek = (week) => request(`/tournaments/week/${week}`);

// Player Images
export const getAllImages = () => request('/images/all');
export const downloadImages = () => request('/images/download', { method: 'POST' });
