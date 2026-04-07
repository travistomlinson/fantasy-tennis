import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './routes/api.js';
import { seedPlayers } from './services/playerSeeding.js';
import { initializeLeague } from './services/leagueState.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Static files (player images)
app.use('/player-images', express.static(join(__dirname, 'public', 'player-images')));

// API routes
app.use('/api', apiRouter);

// Serve built frontend in production
const frontendDist = join(__dirname, '..', 'frontend', 'dist');
import { existsSync } from 'fs';
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // SPA fallback: serve index.html for any non-API route
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/player-images') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(join(frontendDist, 'index.html'));
  });
  console.log('Serving frontend from', frontendDist);
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Fantasy Tennis backend running on http://localhost:${PORT}`);

  // Seed players on startup
  try {
    const players = await seedPlayers();
    console.log(`Loaded ${players.length} players`);
    initializeLeague(players);
    console.log('League initialized');
  } catch (err) {
    console.error('Startup seeding failed:', err.message);
    console.log('League will initialize when players are first requested');
  }
});
