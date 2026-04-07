# Fantasy Tennis — ATP Rules Implementation Plan

## Context

This is a Fantasy Tennis web app (React + Vite frontend, Node/Express backend, JSON file persistence) located at `C:/Users/travi/claude_projects/fantasy-tennis/`. The app currently uses a match-based scoring system that needs to be rewritten to match the official ATP Fantasy rules.

**What to implement:**
1. Tournament-round-based scoring (by tournament category)
2. Updated match bonus/penalty scoring (aces +2, DFs -2, straight sets +10, upset +/-20, bagel lost -10)
3. ATP-official player credit pricing table (rank 1 = 40, rank 101+ = 1)
4. Tournament calendar with 4 Swings and 23 Tournament Weeks (April–November 2026)

**What NOT to implement:** Bonus Ball, Switch system, Chips.

---

## Phase 1: Tournament Calendar & Data Model

### 1a. Create `backend/services/tournamentCalendar.js`

Create a static data file defining the 2026 ATP Fantasy season structure:

**Data shape:**
```javascript
const SWINGS = [
  {
    id: 'clay',
    name: 'Clay Season',
    startDate: '2026-04-05',
    endDate: '2026-06-07',
    tournaments: [
      { name: 'Rolex Monte Carlo Masters', category: 'masters1000', city: 'Monte-Carlo', startDate: '2026-04-05', endDate: '2026-04-19' },
      { name: 'Barcelona Open Banc Sabadell', category: 'atp500', city: 'Barcelona', ... },
      // ... all tournaments listed in the rules
    ]
  },
  { id: 'grass', name: 'Grass Season', startDate: '2026-06-08', endDate: '2026-07-12', tournaments: [...] },
  { id: 'na_hard', name: 'North American Hard Court', startDate: '2026-07-27', endDate: '2026-09-13', tournaments: [...] },
  { id: 'race', name: 'Race To Nitto ATP Finals', startDate: '2026-09-23', endDate: '2026-11-08', tournaments: [...] },
];
```

Each tournament needs: `name`, `category` (one of `atp250`, `atp500`, `masters1000`, `major`), `city`, `startDate`, `endDate`.

**Exports:**
- `getSwings()` — returns all swings
- `getCurrentSwing(date)` — returns swing containing date
- `getTournamentWeek(date)` — returns which tournament week a date falls in
- `getTournamentsForWeek(weekNumber)` — returns tournaments active that week
- `getTournamentCategory(tournamentName)` — looks up category by name
- `TOURNAMENT_WEEKS` — array of 23 week objects: `{ week: 1, startDate, endDate, tournaments: [] }`

**Note:** Tournament names must be matchable against FlashScore tournament labels. Include alternate names/aliases where needed (e.g., "Roland Garros" = "Paris" major).

### 1b. Add tournament API routes

In `backend/routes/api.js`, add:
- `GET /api/tournaments/calendar` — returns full calendar
- `GET /api/tournaments/current` — returns current tournament week + swing
- `GET /api/tournaments/week/:week` — returns specific week's tournaments

---

## Phase 2: Scoring Engine Rewrite

### 2a. Create tournament round scoring table

In `backend/services/scoringEngine.js`, replace the current match-based scoring with:

```javascript
const ROUND_POINTS = {
  atp250:      { R32: 0, R16: 25, QF: 50, SF: 100, F: 165, W: 250 },
  atp500:      { R64: 0, R32: 25, R16: 50, QF: 100, SF: 200, F: 330, W: 500 },
  masters1000: { R128: 10, R64: 30, R32: 50, R16: 100, QF: 200, SF: 400, F: 650, W: 1000 },
  major:       { R128: 10, R64: 50, R32: 100, R16: 200, QF: 400, SF: 800, F: 1300, W: 2000 },
};
```

### 2b. Rewrite `calculateMatchPoints(matchData, playerName)`

The function needs to handle TWO types of scoring that add together:

**A. Tournament Round Points** (new — based on what round the player reached):
- This requires knowing: which tournament, what category, what round the match was in
- The match data from the scraper needs to be enriched with tournament context
- Points are cumulative: if a player reaches the QF, they get points for R32 + R16 + QF

**B. Match Bonus/Penalty Points** (updated values per match):
- Aces: **+2** per ace (was +1)
- Straight sets win: **+10** (was +5)
- Upset win (lower-ranked beats higher-ranked): **+20** (new)
- Double faults: **-2** per DF (was -1)
- Bagel lost (player loses a set 0-6): **-10** (new — replaces the old +3 for winning a bagel)
- Upset loss (higher-ranked loses to lower-ranked): **-20** (new)

**Key design decision:** The scoring engine should calculate points for a player across an entire tournament week, not just per match. For each active roster player:
1. Look at all matches they played that tournament week
2. Determine the furthest round they reached in each tournament
3. Award round points based on tournament category
4. Add/subtract match bonuses/penalties for each match played

### 2c. Update `recalculateWeeklyScores()`

Change to accept tournament week context. For each manager's active players:
1. Find all matches for that player during the tournament week
2. Determine which tournament(s) they played in
3. Calculate round-based points + match bonuses
4. Return detailed breakdown

### 2d. Match data enrichment

The scraper currently returns matches without tournament context. We need to:
- Add `tournamentName` and `tournamentCategory` fields to scraped match data
- The FlashScore scraper already captures tournament groupings on the main page (matches are grouped under tournament headers)
- Update `scraper.js` to capture the tournament header for each match group
- Map tournament names to categories using `tournamentCalendar.js`

If tournament context can't be determined for a match, fall back to match-only bonus/penalty scoring (no round points).

---

## Phase 3: Player Credit Pricing

### 3a. Replace pricing formula in `playerSeeding.js`

Replace the current formula `Math.max(3, Math.round(30 - (rank - 1) * 0.27))` with the ATP official pricing table:

```javascript
function priceFromRank(rank) {
  if (rank === 1) return 40;
  if (rank === 2) return 36;
  if (rank === 3) return 33;
  if (rank === 4) return 30;
  if (rank === 5) return 27;
  if (rank === 6) return 24;
  if (rank === 7) return 21;
  if (rank === 8) return 19;
  if (rank === 9) return 17;
  if (rank === 10) return 15;
  if (rank === 11) return 14;
  if (rank === 12) return 13;
  if (rank === 13) return 12;
  if (rank === 14) return 11;
  if (rank === 15) return 10;
  if (rank === 16) return 9;
  if (rank >= 17 && rank <= 20) return 8;
  if (rank >= 21 && rank <= 25) return 7;
  if (rank >= 26 && rank <= 30) return 6;
  if (rank >= 31 && rank <= 36) return 5;
  if (rank >= 37 && rank <= 49) return 4;
  if (rank >= 50 && rank <= 74) return 3;
  if (rank >= 75 && rank <= 100) return 2;
  return 1; // 101+
}
```

### 3b. Update `rankingScraper.js`

Use the same `priceFromRank` function (import it or duplicate it).

### 3c. Remove dynamic market pricing

In `leagueState.js`, remove `updateMarketPrices()` which adds `fantasyPoints * 0.5` to price. Per ATP rules, prices are purely rank-based and update when rankings change — not based on fantasy performance.

### 3d. Update league initialization

Reset the starting budget: still 100 credits. But with new pricing, a top-10 player costs 15–40 credits, so team composition strategy changes significantly. Ensure bot roster generation works with new prices (total cost of 8 players must be ≤ 100).

---

## Phase 4: Frontend Updates

### 4a. Update `MatchFeed.jsx` client-side `calcPoints()`

Mirror the new scoring rules:
- Remove: old match win +10, old straight sets +5, old bagel won +3, old aces +1, old DFs -1
- Add: aces +2, DFs -2, straight sets +10, upset +20/-20, bagel lost -10
- Tournament round points should come from the backend (too complex for client-side without tournament context), so display them from the API response rather than recalculating

### 4b. Update `MyTeam.jsx` scoring breakdown display

Show tournament round points separately from match bonuses:
```
Monte-Carlo Masters (QF): +200pts
  vs Djokovic: +10 straight sets, +6 aces (3x2), -4 DFs (2x2), +20 upset
  vs Ruud: +4 aces (2x2)
```

### 4c. Update `PlayerMarket.jsx` pricing display

Show credits instead of coins. The price column should reflect the new rank-based table. Consider showing the rank bracket (e.g., "Rank 1: 40cr" vs "Rank 50-74: 3cr").

### 4d. Add Tournament Calendar page or section

New page or section showing:
- Current Swing with progress
- Tournament Week schedule
- Which tournaments are active this week
- Tournament categories with color coding

### 4e. Update `AdminPanel.jsx`

- Replace "Advance Week" with tournament-week-aware advancement
- Show current tournament week and swing
- Add ability to select which tournament week to score

### 4f. Update `History.jsx`

- Show tournament context in historical week views
- Display round-based scoring breakdowns
- Group by tournament within a week

---

## Phase 5: Scraper Enhancement

### 5a. Capture tournament names from FlashScore

The FlashScore main page groups matches under tournament headers. Update the scraper to:
1. Parse tournament headers (e.g., "ATP - SINGLES - MONTE CARLO, CLAY - QUARTER-FINALS")
2. Extract tournament name and round from the header
3. Attach `tournamentName`, `round` (R128/R64/R32/R16/QF/SF/F/W) to each match

### 5b. Map FlashScore tournament names to calendar

Create a mapping function that normalizes FlashScore tournament names to our calendar entries. E.g.:
- "MONTE CARLO" → "Rolex Monte Carlo Masters" → `masters1000`
- "BARCELONA" → "Barcelona Open Banc Sabadell" → `atp500`

### 5c. Add round detection from match detail pages

On match detail pages (already visited for aces/DFs), the round is typically shown. Capture it as additional metadata.

---

## File Change Summary

| File | Action |
|------|--------|
| `backend/services/tournamentCalendar.js` | **NEW** — tournament data, swings, weeks |
| `backend/services/scoringEngine.js` | **REWRITE** — round-based + new bonuses |
| `backend/services/playerSeeding.js` | **EDIT** — new `priceFromRank()` |
| `backend/services/rankingScraper.js` | **EDIT** — use new pricing |
| `backend/services/leagueState.js` | **EDIT** — remove `updateMarketPrices()`, update bot generation |
| `backend/services/scraper.js` | **EDIT** — capture tournament name + round per match |
| `backend/routes/api.js` | **EDIT** — add tournament routes, update recalculate |
| `frontend/src/api.js` | **EDIT** — add tournament API calls |
| `frontend/src/pages/MatchFeed.jsx` | **EDIT** — new scoring display + calcPoints |
| `frontend/src/pages/MyTeam.jsx` | **EDIT** — tournament-aware scoring breakdown |
| `frontend/src/pages/PlayerMarket.jsx` | **EDIT** — new pricing display |
| `frontend/src/pages/AdminPanel.jsx` | **EDIT** — tournament week controls |
| `frontend/src/pages/History.jsx` | **EDIT** — tournament context in history |
| `frontend/src/App.jsx` | **EDIT** — pass tournament data to pages |

## Implementation Order

1. **Phase 3 first** (pricing) — smallest, self-contained, immediately testable
2. **Phase 1** (tournament calendar) — data foundation for everything else
3. **Phase 5** (scraper enhancement) — needed before scoring can work
4. **Phase 2** (scoring engine) — core logic rewrite, depends on phases 1 & 5
5. **Phase 4** (frontend) — display layer, do last

Each phase should be verified working before moving to the next.
