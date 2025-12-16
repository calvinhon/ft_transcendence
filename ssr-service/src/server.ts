// ssr-service/src/server.ts
import express, { Request, Response } from 'express';
import { renderHomePage } from './renderers/homeRenderer.js';
import { renderGamePage } from './renderers/gameRenderer.js';
import { renderProfilePage } from './renderers/profileRenderer.js';
import { renderLeaderboardPage } from './renderers/leaderboardRenderer.js';
import { getMetaTags } from './utils/metaTags.js';

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'ssr-service',
    timestamp: new Date().toISOString(),
    modules: ['ssr']
  });
});

// SSR Routes
app.get('/ssr', async (req: Request, res: Response) => {
  try {
    const html = await renderHomePage();
    res.send(html);
  } catch (error) {
    console.error('SSR Home Error:', error);
    res.status(500).send('SSR Error');
  }
});

app.get('/ssr/game', async (req: Request, res: Response) => {
  try {
    const html = await renderGamePage();
    res.send(html);
  } catch (error) {
    console.error('SSR Game Error:', error);
    res.status(500).send('SSR Error');
  }
});

app.get('/ssr/profile/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const html = await renderProfilePage(userId);
    res.send(html);
  } catch (error) {
    console.error('SSR Profile Error:', error);
    res.status(500).send('SSR Error');
  }
});

app.get('/ssr/leaderboard', async (req: Request, res: Response) => {
  try {
    const html = await renderLeaderboardPage();
    res.send(html);
  } catch (error) {
    console.error('SSR Leaderboard Error:', error);
    res.status(500).send('SSR Error');
  }
});

// Meta tags endpoint (for dynamic meta tag generation)
app.get('/ssr/meta/:route', (req: Request, res: Response) => {
  const { route } = req.params;
  const metaTags = getMetaTags(route);
  res.json(metaTags);
});

// Status endpoint
app.get('/ssr/status', (req: Request, res: Response) => {
  res.json({
    enabled: true,
    routes: ['/ssr', '/ssr/game', '/ssr/profile/:userId', '/ssr/leaderboard'],
    features: ['SEO', 'OpenGraph', 'Pre-rendering', 'Hydration']
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`SSR service running on port ${PORT}`);
});

export default app;
