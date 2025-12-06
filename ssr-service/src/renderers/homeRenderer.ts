// ssr-service/src/renderers/homeRenderer.ts
import { generateHTML } from '../utils/template.js';

export async function renderHomePage(): Promise<string> {
  const content = `
    <h2>Welcome to FT Transcendence</h2>
    <p>Experience the classic Pong game with modern multiplayer features, tournaments, and blockchain-powered leaderboards.</p>
    
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-value">∞</div>
        <div class="stat-label">Real-time Multiplayer</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">60</div>
        <div class="stat-label">FPS Server-Side Physics</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">4</div>
        <div class="stat-label">Microservices</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">✓</div>
        <div class="stat-label">Blockchain Rankings</div>
      </div>
    </div>
    
    <h3 style="margin-top: 2rem;">Features</h3>
    <ul style="list-style: none; padding-left: 0;">
      <li>✓ Real-time WebSocket gameplay at 60 FPS</li>
      <li>✓ AI opponents with multiple difficulty levels</li>
      <li>✓ Tournament system with bracket generation</li>
      <li>✓ Blockchain-verified leaderboards</li>
      <li>✓ OAuth authentication (Google, GitHub)</li>
      <li>✓ GDPR-compliant data management</li>
    </ul>
  `;

  const data = {
    route: 'home',
    timestamp: new Date().toISOString(),
    features: ['multiplayer', 'tournaments', 'blockchain', 'ai']
  };

  return generateHTML('home', content, data);
}
