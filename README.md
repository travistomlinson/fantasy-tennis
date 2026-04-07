# Fantasy Tennis

A fantasy sports web app for tennis. Draft players, set lineups, and compete against other managers based on real match results.

## Stack

- **Frontend:** React 18 + Vite
- **Backend:** Node.js + Express
- **Persistence:** localStorage (client) + JSON file (server)
- **Data:** Jeff Sackmann GitHub CSVs + API-Sports Tennis + Playwright scraper fallback

## Setup

### Prerequisites

- Node.js 18+
- npm

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your API-Sports key (see below)
npm run dev
```

Backend runs on http://localhost:3001

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173 (proxies API calls to backend)

### 3. Getting an API-Sports Key

1. Go to https://dashboard.api-football.com/
2. Create a free account
3. In the dashboard, find your API key
4. The free tier includes Tennis and gives you **100 requests/day**
5. Add your key to `backend/.env`:
   ```
   API_SPORTS_KEY=your_key_here
   ```

The app works without an API key — it seeds players from GitHub CSVs and you can enter match results manually via the Admin panel.

### 4. Playwright Scraper (Optional)

The scraper is a Layer 3 fallback when API-Sports quota is exhausted. To enable it:

```bash
cd backend
npx playwright install chromium
```

The scraper targets FlashScore for completed match results. It runs automatically when the API quota is depleted. Ace/DF stats are not available via scraping — those scoring items are skipped and a "Limited Data" badge appears in the UI.

## How It Works

### Data Layers (most reliable to least)

| Layer | Source | What it provides |
|-------|--------|-----------------|
| 1 | Jeff Sackmann GitHub CSVs | Player names, rankings, pricing (refreshed daily) |
| 2 | API-Sports Tennis | Live matches, completed results, aces, DFs |
| 3 | Playwright + FlashScore | Completed match scores (no ace/DF data) |
| 4 | Manual entry | Admin enters results when all else fails |

### Scoring

| Event | Points |
|-------|--------|
| Match win | +10 |
| Win in straight sets | +5 bonus |
| Each ace | +1 |
| Each double fault | -1 |
| Bagel set (6-0) won | +3 bonus |
| Retirement/walkover win | +5 |

Only **active** (non-bench) players score points each week.

### Rules

- Start with **100 coins**
- Roster: **8 players** max, **6 active** per week
- Each week: drop up to 2, pick up 2 from free agency
- Multiple managers can own the same player
- Player price = `max(3, round(30 - (rank - 1) * 0.27))`
- Market value updates weekly: `basePrice + (fantasyPoints * 0.5)`

## Pages

- **League Hub** — Leaderboard with standings, points, coins
- **My Team** — Manage active/bench, sell players, view scoring breakdowns
- **Player Market** — Browse/search ATP & WTA players, buy for your roster
- **Match Feed** — Live and recent matches with per-match point breakdowns
- **Admin Panel** — Advance week, recalculate scores, enter manual results, check API quota
