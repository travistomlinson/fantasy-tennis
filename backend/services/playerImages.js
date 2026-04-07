import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(__dirname, '..', 'public', 'player-images');
const MAP_FILE = join(__dirname, '..', 'player-images.json');

// Map: normalized player name -> { url, localPath, fetchedAt }
let imageMap = null;

function load() {
  if (imageMap) return imageMap;
  if (existsSync(MAP_FILE)) {
    try {
      imageMap = JSON.parse(readFileSync(MAP_FILE, 'utf-8'));
      console.log(`[PlayerImages] Loaded ${Object.keys(imageMap).length} player image mappings`);
      return imageMap;
    } catch (e) {
      console.warn('[PlayerImages] Failed to load map:', e.message);
    }
  }
  imageMap = {};
  return imageMap;
}

function save() {
  writeFileSync(MAP_FILE, JSON.stringify(imageMap, null, 2));
}

function normalizeName(name) {
  return (name || '').toLowerCase().trim();
}

export function getImageUrl(playerName) {
  load();
  const entry = imageMap[normalizeName(playerName)];
  if (!entry) return null;
  // Return local path if downloaded, otherwise remote URL
  if (entry.localFile) return `/player-images/${entry.localFile}`;
  return entry.url;
}

// Build a lookup-friendly version keyed by multiple name formats
export function getAllImages() {
  load();
  const result = { ...imageMap };

  // Add reverse-format keys so "C. Alcaraz" → "alcaraz c." lookups also work
  for (const [key, value] of Object.entries(imageMap)) {
    // key is "lastname f." format — also add "f. lastname" format
    const parts = key.split(/\s+/);
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1]; // "c."
      const firstName = parts.slice(0, -1).join(' '); // "alcaraz" or "auger-aliassime"
      const reversed = `${lastPart} ${firstName}`; // "c. alcaraz"
      if (!result[reversed]) result[reversed] = value;
    }
  }
  return result;
}

// Register image URLs discovered during scraping
export function registerImages(playerImagePairs) {
  load();
  let newCount = 0;
  for (const { name, url } of playerImagePairs) {
    if (!name || !url) continue;
    const key = normalizeName(name);
    if (!imageMap[key]) {
      imageMap[key] = { url, fetchedAt: Date.now() };
      newCount++;
    }
  }
  if (newCount > 0) {
    save();
    console.log(`[PlayerImages] Registered ${newCount} new images (total: ${Object.keys(imageMap).length})`);
  }
}

// Download images to local disk for offline/fast serving
export async function downloadImages() {
  load();
  if (!existsSync(IMAGES_DIR)) {
    mkdirSync(IMAGES_DIR, { recursive: true });
  }

  let downloaded = 0;
  const entries = Object.entries(imageMap);

  for (const [name, entry] of entries) {
    if (entry.localFile) continue; // already downloaded
    if (!entry.url) continue;

    try {
      const res = await fetch(entry.url);
      if (!res.ok) continue;

      const buffer = Buffer.from(await res.arrayBuffer());
      const ext = entry.url.includes('.png') ? 'png' : 'jpg';
      const filename = `${name.replace(/[^a-z0-9]/g, '_')}.${ext}`;
      const filepath = join(IMAGES_DIR, filename);
      writeFileSync(filepath, buffer);

      entry.localFile = filename;
      downloaded++;
    } catch (e) {
      // skip failed downloads
    }
  }

  if (downloaded > 0) {
    save();
    console.log(`[PlayerImages] Downloaded ${downloaded} images to disk`);
  }

  return downloaded;
}

// Scrape images for a list of player names from Flashscore search
export async function scrapeImagesForPlayers(playerNames) {
  load();
  if (!existsSync(IMAGES_DIR)) mkdirSync(IMAGES_DIR, { recursive: true });

  // Build set of names we already have (in all formats)
  const existingKeys = new Set(Object.keys(imageMap));
  const allImages = getAllImages();
  for (const k of Object.keys(allImages)) existingKeys.add(k);

  // Filter to players missing images
  const missing = playerNames.filter(name => {
    const direct = normalizeName(name);
    const parts = direct.split(/\s+/);
    let reversed = direct;
    if (parts.length >= 2) {
      const first = parts[0].replace('.', '');
      const last = parts.slice(1).join(' ');
      reversed = `${last} ${first.charAt(0)}.`;
    }
    return !existingKeys.has(direct) && !existingKeys.has(reversed);
  });

  if (missing.length === 0) {
    console.log('[PlayerImages] All players already have images');
    return 0;
  }

  console.log(`[PlayerImages] Scraping images for ${missing.length} players...`);

  let pw, browser;
  try {
    pw = await import('playwright');
    browser = await pw.chromium.launch({ headless: true });
  } catch (err) {
    console.error('[PlayerImages] Playwright not available:', err.message);
    return 0;
  }

  let fetched = 0;
  const BATCH = 5;

  try {
    for (let i = 0; i < missing.length; i += BATCH) {
      const batch = missing.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(async (name) => {
        let page;
        try {
          // Search Flashscore for this player
          const lastName = name.split(/\s+/).pop().toLowerCase();
          page = await browser.newPage();
          await page.goto(`https://www.flashscore.com/search/?q=${encodeURIComponent(lastName)}`, {
            waitUntil: 'networkidle', timeout: 15000,
          });
          await page.waitForTimeout(1500);

          // Find player image in search results
          const imgData = await page.evaluate((searchName) => {
            const items = document.querySelectorAll('[class*=search] a, .search-result a, a[href*=player]');
            for (const item of items) {
              const text = item.textContent?.toLowerCase() || '';
              const nameParts = searchName.toLowerCase().split(/\s+/);
              const lastName = nameParts[nameParts.length - 1];
              if (text.includes(lastName)) {
                const img = item.querySelector('img');
                if (img && img.src && !img.src.includes('data:')) {
                  // Get display name from the link
                  const displayName = item.textContent?.replace(/\s+/g, ' ')?.trim() || '';
                  return { url: img.src, displayName };
                }
              }
            }
            return null;
          }, name);

          await page.close();

          if (imgData?.url) {
            return { name, url: imgData.url, displayName: imgData.displayName };
          }
          return null;
        } catch {
          if (page) await page.close().catch(() => {});
          return null;
        }
      }));

      for (const r of results) {
        if (!r) continue;
        // Store under both normalized formats
        const direct = normalizeName(r.name);
        const parts = direct.split(/\s+/);
        let reversed = direct;
        if (parts.length >= 2) {
          const first = parts[0].replace('.', '');
          const last = parts.slice(1).join(' ');
          reversed = `${last} ${first.charAt(0)}.`;
        }

        // Download the image
        try {
          const res = await fetch(r.url);
          if (res.ok) {
            const buffer = Buffer.from(await res.arrayBuffer());
            const ext = r.url.includes('.png') ? 'png' : 'jpg';
            const filename = `${direct.replace(/[^a-z0-9]/g, '_')}.${ext}`;
            const filepath = join(IMAGES_DIR, filename);
            writeFileSync(filepath, buffer);

            const entry = { url: r.url, fetchedAt: Date.now(), localFile: filename };
            imageMap[direct] = entry;
            imageMap[reversed] = entry;
            fetched++;
          }
        } catch {
          // Store URL-only entry
          const entry = { url: r.url, fetchedAt: Date.now() };
          imageMap[direct] = entry;
          imageMap[reversed] = entry;
          fetched++;
        }
      }

      console.log(`[PlayerImages] Batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(missing.length / BATCH)}: ${fetched} total fetched`);
    }
  } finally {
    await browser.close();
  }

  if (fetched > 0) {
    save();
    console.log(`[PlayerImages] Scraped ${fetched} new player images (total: ${Object.keys(imageMap).length})`);
  }
  return fetched;
}

export function getStats() {
  load();
  const total = Object.keys(imageMap).length;
  const downloaded = Object.values(imageMap).filter(e => e.localFile).length;
  return { total, downloaded, remote: total - downloaded };
}
