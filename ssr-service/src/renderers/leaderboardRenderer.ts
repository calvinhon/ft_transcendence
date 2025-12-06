// ssr-service/src/renderers/leaderboardRenderer.ts
import { generateHTML } from '../utils/template.js';

export async function renderLeaderboardPage(): Promise<string> {
  const content = `
    <h2>Global Leaderboard</h2>
    <p>Top players ranked by performance. Rankings verified on blockchain.</p>
    
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-value">⛓️</div>
        <div class="stat-label">Blockchain Verified</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">∞</div>
        <div class="stat-label">Total Players</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">🏆</div>
        <div class="stat-label">Active Tournaments</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">📊</div>
        <div class="stat-label">Live Stats</div>
      </div>
    </div>
    
    <h3 style="margin-top: 2rem;">Top Players</h3>
    <div style="background: #2a2a2a; padding: 1rem; border-radius: 8px;">
      <p style="color: #888;">Loading leaderboard data...</p>
      <ul style="list-style: none; padding-left: 0; margin-top: 1rem;">
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #3a3a3a;">
          <strong>1.</strong> Player 1 - <span style="color: #4CAF50;">95% Win Rate</span>
        </li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #3a3a3a;">
          <strong>2.</strong> Player 2 - <span style="color: #4CAF50;">92% Win Rate</span>
        </li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #3a3a3a;">
          <strong>3.</strong> Player 3 - <span style="color: #4CAF50;">88% Win Rate</span>
        </li>
      </ul>
    </div>
  `;

  const data = {
    route: 'leaderboard',
    blockchain: true,
    topPlayers: []
  };

  return generateHTML('leaderboard', content, data);
}
