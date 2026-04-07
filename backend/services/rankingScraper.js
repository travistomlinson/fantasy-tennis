import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { priceFromRank } from './pricing.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = join(__dirname, '..', 'rankings-cache.json');

let cache = null;

function loadCache() {
  if (cache) return cache;
  if (existsSync(CACHE_FILE)) {
    try {
      cache = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
      const age = Date.now() - (cache.fetchedAt || 0);
      const hours = Math.round(age / 3600000);
      console.log(`[Rankings] Loaded cache: ${cache.atp?.length || 0} ATP, ${cache.wta?.length || 0} WTA (${hours}h old)`);
      return cache;
    } catch (e) {
      console.warn('[Rankings] Failed to load cache:', e.message);
    }
  }
  cache = { atp: [], wta: [], fetchedAt: 0 };
  return cache;
}

function saveCache() {
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function cleanName(raw) {
  // Remove whitespace noise, collapse spaces
  return raw.replace(/\s+/g, ' ').trim();
}

// Expand abbreviated first names using common patterns
// "C. Alcaraz" -> "Carlos Alcaraz" won't work without a lookup,
// but we keep the abbreviated form since that's what FlashScore uses too
function formatName(name) {
  return cleanName(name);
}

async function scrapeATPRankings(browser) {
  console.log('[Rankings] Scraping ATP rankings from atptour.com...');
  let page;
  try {
    page = await browser.newPage();
    await page.goto('https://www.atptour.com/en/rankings/singles', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    const players = await page.evaluate(() => {
      const rows = document.querySelectorAll('tr');
      const results = [];
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length < 3) continue;

        const rankText = cells[0]?.textContent?.trim();
        const rank = parseInt(rankText);
        if (!rank || rank <= 0 || rank > 200) continue;

        // Player name from link or cell
        const nameEl = row.querySelector('a[href*=player]') || cells[1];
        const name = nameEl?.textContent?.replace(/\s+/g, ' ')?.trim() || '';
        if (!name) continue;

        // Points from 3rd column
        const pointsText = cells[2]?.textContent?.replace(/,/g, '')?.trim();
        const points = parseInt(pointsText) || 0;

        // Country from flag image alt or data attribute
        const flagEl = row.querySelector('img[class*=flag], [class*=country], [data-country]');
        const country = flagEl?.alt?.trim() || flagEl?.getAttribute('data-country') || '';

        results.push({ rank, name, points, country });
      }
      return results;
    });

    await page.close();
    console.log(`[Rankings] Scraped ${players.length} ATP players`);
    return players;
  } catch (err) {
    if (page) await page.close().catch(() => {});
    console.error('[Rankings] ATP scrape failed:', err.message);
    return [];
  }
}

async function scrapeWTARankings(browser) {
  console.log('[Rankings] Scraping WTA rankings from wtatennis.com...');
  let page;
  try {
    page = await browser.newPage();
    await page.goto('https://www.wtatennis.com/rankings/singles', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // WTA site loads rankings dynamically, wait for content
    await page.waitForTimeout(3000);

    // Scroll to load more players
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
    }

    const players = await page.evaluate(() => {
      const results = [];
      // Try to find ranking entries
      const rows = document.querySelectorAll('[class*=ranking] tr, [class*=player-row], [class*=rankings__row], table tbody tr');

      for (const row of rows) {
        const text = row.textContent?.replace(/\s+/g, ' ')?.trim() || '';
        const cells = row.querySelectorAll('td');
        if (cells.length < 2) continue;

        const rankText = cells[0]?.textContent?.trim();
        const rank = parseInt(rankText);
        if (!rank || rank <= 0 || rank > 200) continue;

        // Find player name
        const nameEl = row.querySelector('a[href*=player], [class*=name]') || cells[1];
        let name = nameEl?.textContent?.replace(/\s+/g, ' ')?.trim() || '';
        if (!name || name.length < 3) continue;

        // Points
        let points = 0;
        for (const cell of cells) {
          const t = cell.textContent?.replace(/,/g, '')?.trim();
          const n = parseInt(t);
          if (n > 100 && n < 20000) { points = n; break; }
        }

        // Country
        const flagEl = row.querySelector('img[class*=flag], [class*=country]');
        const country = flagEl?.alt?.trim() || '';

        results.push({ rank, name, points, country });
      }
      return results;
    });

    await page.close();
    console.log(`[Rankings] Scraped ${players.length} WTA players`);
    return players;
  } catch (err) {
    if (page) await page.close().catch(() => {});
    console.error('[Rankings] WTA scrape failed:', err.message);
    return [];
  }
}

export async function scrapeCurrentRankings(forceRefresh = false) {
  loadCache();

  const ONE_DAY = 24 * 60 * 60 * 1000;
  if (!forceRefresh && cache.atp.length > 0 && (Date.now() - cache.fetchedAt) < ONE_DAY) {
    console.log('[Rankings] Using cached rankings');
    return { atp: cache.atp, wta: cache.wta };
  }

  let pw, browser;
  try {
    pw = await import('playwright');
    browser = await pw.chromium.launch({ headless: true });
  } catch (err) {
    console.error('[Rankings] Playwright not available:', err.message);
    return { atp: cache.atp, wta: cache.wta };
  }

  try {
    const atp = await scrapeATPRankings(browser);
    const wta = await scrapeWTARankings(browser);

    // Build player objects
    const atpPlayers = atp.map(p => ({
      id: `atp_${p.name.toLowerCase().replace(/[^a-z]/g, '_')}`,
      name: formatName(p.name),
      country: p.country,
      rank: p.rank,
      tour: 'ATP',
      atpPoints: p.points,
      basePrice: priceFromRank(p.rank),
      currentPrice: priceFromRank(p.rank),
      fantasyPoints: 0,
      recentMatches: [],
    }));

    const wtaPlayers = wta.map(p => ({
      id: `wta_${p.name.toLowerCase().replace(/[^a-z]/g, '_')}`,
      name: formatName(p.name),
      country: p.country,
      rank: p.rank,
      tour: 'WTA',
      atpPoints: p.points,
      basePrice: priceFromRank(p.rank),
      currentPrice: priceFromRank(p.rank),
      fantasyPoints: 0,
      recentMatches: [],
    }));

    if (atpPlayers.length > 0) {
      cache.atp = atpPlayers;
    }
    if (wtaPlayers.length > 0) {
      cache.wta = wtaPlayers;
    }
    cache.fetchedAt = Date.now();
    saveCache();

    return { atp: cache.atp, wta: cache.wta };
  } finally {
    await browser.close();
  }
}

export function getCachedRankings() {
  loadCache();
  return { atp: cache.atp, wta: cache.wta };
}
