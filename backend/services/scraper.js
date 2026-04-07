import { registerImages } from './playerImages.js';
import { findTournament } from './tournamentCalendar.js';

let playwrightAvailable = false;
let browser = null;
let scrapeCache = { matches: [], fetchedAt: 0 };
const CACHE_TTL = 3 * 60 * 1000; // 3 min cache

async function ensureBrowser() {
  if (browser) return browser;

  try {
    const pw = await import('playwright');
    browser = await pw.chromium.launch({ headless: true });
    playwrightAvailable = true;
    console.log('[Layer3] Playwright browser launched');
    return browser;
  } catch (err) {
    console.warn('[Layer3] Playwright not available:', err.message);
    playwrightAvailable = false;
    return null;
  }
}

// Scrape ace/DF stats from a match detail page
async function scrapeMatchStats(browser, matchUrl) {
  let page;
  try {
    page = await browser.newPage();
    await page.goto(matchUrl, { waitUntil: 'networkidle', timeout: 20000 });

    // Click STATS tab
    const statsTab = page.locator('a:has-text("STATS"), button:has-text("STATS")').first();
    if (await statsTab.isVisible().catch(() => false)) {
      await statsTab.click();
      await page.waitForTimeout(1500);
    }

    const text = await page.locator('body').innerText();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    // Find stats section — pattern is: homeValue / statName / awayValue
    let homeAces = null, awayAces = null, homeDFs = null, awayDFs = null;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === 'Aces' && i >= 1 && i + 1 < lines.length) {
        homeAces = parseInt(lines[i - 1]) || 0;
        awayAces = parseInt(lines[i + 1]) || 0;
      }
      if (lines[i] === 'Double Faults' && i >= 1 && i + 1 < lines.length) {
        homeDFs = parseInt(lines[i - 1]) || 0;
        awayDFs = parseInt(lines[i + 1]) || 0;
      }
    }

    // Try to detect round from detail page
    let detectedRound = null;
    const pageText = text.toUpperCase();
    const roundChecks = [
      { pattern: /\bFINAL\b(?!\s*S)/, round: 'F' },
      { pattern: /SEMI.?FINAL/, round: 'SF' },
      { pattern: /QUARTER.?FINAL/, round: 'QF' },
      { pattern: /ROUND OF 16|R16/, round: 'R16' },
      { pattern: /ROUND OF 32|R32/, round: 'R32' },
      { pattern: /ROUND OF 64|R64/, round: 'R64' },
      { pattern: /ROUND OF 128|R128/, round: 'R128' },
    ];
    for (const { pattern, round } of roundChecks) {
      if (pattern.test(pageText)) {
        detectedRound = round;
        break;
      }
    }

    // Grab player images
    const images = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img.participant__image');
      return Array.from(imgs).map(img => ({
        name: img.alt || '',
        url: img.src || '',
      })).filter(i => i.name && i.url && !i.url.includes('data:'));
    });
    // Dedupe and register
    const seen = new Set();
    const unique = [];
    for (const img of images) {
      if (!seen.has(img.name)) {
        seen.add(img.name);
        unique.push(img);
      }
    }
    if (unique.length > 0) registerImages(unique);

    await page.close();
    return { homeAces, awayAces, homeDFs, awayDFs, detectedRound };
  } catch (err) {
    if (page) await page.close().catch(() => {});
    return { homeAces: null, awayAces: null, homeDFs: null, awayDFs: null, detectedRound: null };
  }
}

export async function scrapeRecentMatches() {
  // Return cache if fresh
  if (scrapeCache.matches.length > 0 && (Date.now() - scrapeCache.fetchedAt) < CACHE_TTL) {
    console.log(`[Layer3] Returning cached scrape (${scrapeCache.matches.length} matches)`);
    return scrapeCache.matches;
  }

  const b = await ensureBrowser();
  if (!b) return [];

  console.log('[Layer3] Scraping FlashScore for recent matches...');

  try {
    const page = await b.newPage();
    await page.goto('https://www.flashscore.com/tennis/', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForSelector('.event__match', { timeout: 10000 }).catch(() => {});

    const matches = await page.evaluate(() => {
      // Walk all event rows — headers define the current tournament context
      const allRows = document.querySelectorAll('[class*="event__header"], .event__match');
      const results = [];
      let currentTournament = '';
      let currentRound = '';

      allRows.forEach(row => {
        try {
          // Tournament header row
          if (row.className.includes('event__header') || row.className.includes('header')) {
            const headerText = row.textContent?.trim()?.toUpperCase() || '';
            // Parse tournament name and round from header
            // Typical: "ATP - SINGLES - MONTE CARLO, CLAY - QUARTER-FINALS"
            // or: "ATP - MONTE CARLO - QUARTER-FINALS"
            currentTournament = headerText;

            // Extract round from common patterns
            const roundPatterns = [
              { pattern: /FINAL(?!S)/, round: 'F' },
              { pattern: /SEMI.?FINAL/, round: 'SF' },
              { pattern: /QUARTER.?FINAL/, round: 'QF' },
              { pattern: /ROUND OF 16|R16|3RD ROUND/, round: 'R16' },
              { pattern: /ROUND OF 32|R32|2ND ROUND/, round: 'R32' },
              { pattern: /ROUND OF 64|R64|1ST ROUND/, round: 'R64' },
              { pattern: /ROUND OF 128|R128|QUALIFICATION/, round: 'R128' },
            ];
            currentRound = '';
            for (const { pattern, round } of roundPatterns) {
              if (pattern.test(headerText)) {
                currentRound = round;
                break;
              }
            }
            return;
          }

          // Match row
          const homeEl = row.querySelector('[class*="participant--home"]');
          const awayEl = row.querySelector('[class*="participant--away"]');
          const homePlayer = homeEl?.textContent?.trim() || '';
          const awayPlayer = awayEl?.textContent?.trim() || '';
          if (!homePlayer || !awayPlayer) return;

          const homeScoreEl = row.querySelector('[class*="score--home"]');
          const awayScoreEl = row.querySelector('[class*="score--away"]');
          const homeSets = parseInt(homeScoreEl?.textContent?.trim()) || 0;
          const awaySets = parseInt(awayScoreEl?.textContent?.trim()) || 0;

          const partEls = row.querySelectorAll('[class*="part"]');
          const partTexts = Array.from(partEls).map(p => p.textContent?.trim());
          const numericParts = partTexts.filter(t => /^\d+$/.test(t));
          const sets = [];
          for (let i = 0; i < numericParts.length - 1; i += 2) {
            sets.push({
              home: parseInt(numericParts[i]),
              away: parseInt(numericParts[i + 1]),
            });
          }

          const stageEl = row.querySelector('[class*="stage"]');
          const stageText = stageEl?.textContent?.trim()?.toLowerCase() || '';
          const isLive = stageText.includes('set') || stageText.includes('live');
          const isCancelled = stageText.includes('cancel') || stageText.includes('walkover') ||
            stageText.includes('retired');

          if (homeSets === 0 && awaySets === 0 && sets.length === 0) return;

          // Grab the match detail link
          const linkEl = row.querySelector('a.eventRowLink');
          const detailUrl = linkEl?.href || '';

          results.push({
            homePlayer, awayPlayer, homeSets, awaySets, sets,
            isComplete: !isLive, isLive, isRetirement: isCancelled,
            stageText, detailUrl,
            tournamentHeader: currentTournament,
            round: currentRound,
          });
        } catch (e) {
          // skip
        }
      });

      return results;
    });

    await page.close();

    // Process base match data with tournament context resolution
    const processed = matches.map((m, i) => {
      // Resolve tournament from header using calendar aliases
      const tournament = findTournament(m.tournamentHeader || '');
      return {
        matchId: `scrape_${Date.now()}_${i}`,
        ...m,
        winner: m.homeSets >= m.awaySets ? 'home' : 'away',
        winnerName: m.homeSets >= m.awaySets ? m.homePlayer : m.awayPlayer,
        loserName: m.homeSets >= m.awaySets ? m.awayPlayer : m.homePlayer,
        isStraightSets: (m.homeSets === 2 && m.awaySets === 0) || (m.awaySets === 2 && m.homeSets === 0),
        homeAces: null,
        awayAces: null,
        homeDFs: null,
        awayDFs: null,
        tournamentName: tournament?.name || null,
        tournamentCategory: tournament?.category || null,
        round: m.round || null,
        dataSource: 'scraped',
        limitedData: true,
        timestamp: new Date().toISOString(),
      };
    });

    console.log(`[Layer3] Scraped ${processed.length} matches from main page`);

    // Fetch ace/DF stats from detail pages for completed matches (parallel, batched)
    const completed = processed.filter(m => m.isComplete && m.detailUrl);
    console.log(`[Layer3] Fetching stats for ${completed.length} completed matches...`);

    const BATCH_SIZE = 5;
    for (let i = 0; i < completed.length; i += BATCH_SIZE) {
      const batch = completed.slice(i, i + BATCH_SIZE);
      const statsResults = await Promise.all(
        batch.map(m => scrapeMatchStats(b, m.detailUrl))
      );
      for (let j = 0; j < batch.length; j++) {
        const stats = statsResults[j];
        const match = batch[j];
        match.homeAces = stats.homeAces;
        match.awayAces = stats.awayAces;
        match.homeDFs = stats.homeDFs;
        match.awayDFs = stats.awayDFs;
        match.limitedData = stats.homeAces === null;
        // Use detail page round if main page didn't capture it
        if (!match.round && stats.detectedRound) {
          match.round = stats.detectedRound;
        }
        if (stats.homeAces !== null) {
          console.log(`[Layer3]   ${match.homePlayer} vs ${match.awayPlayer}: aces ${stats.homeAces}/${stats.awayAces}, DFs ${stats.homeDFs}/${stats.awayDFs}`);
        }
      }
      console.log(`[Layer3] Stats batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(completed.length / BATCH_SIZE)} done`);
    }

    const withStats = processed.filter(m => m.homeAces !== null).length;
    console.log(`[Layer3] Stats populated for ${withStats}/${processed.length} matches`);

    scrapeCache = { matches: processed, fetchedAt: Date.now() };
    return processed;
  } catch (err) {
    console.error('[Layer3] Scraping failed:', err.message);
    return scrapeCache.matches;
  }
}

export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

export function isPlaywrightAvailable() {
  return playwrightAvailable;
}
