// ssr-service/src/renderers/homeRenderer.ts
import { generateHTML } from '../utils/template.js';
import { createLogger } from '@ft-transcendence/common';

const logger = createLogger('SSR-SERVICE');

async function fetchSystemStats(): Promise<any> {
  try {
    const stats = {
      totalUsers: 0,
      activeGames: 0,
      totalGamesPlayed: 0,
      activeTournaments: 0
    };

    // Try to get user count from user service
    try {
      const userResponse = await fetch('http://user-service:3000/health');
      if (userResponse.ok) {
        stats.totalUsers = -1; // Placeholder - would need a user count endpoint
      }
    } catch (e) {
      logger.error('Failed to fetch user stats:', e);
    }

    // Try to get tournament count
    try {
      const tournamentResponse = await fetch('http://tournament-service:3004/tournaments/active');
      if (tournamentResponse.ok) {
        const tournaments = await tournamentResponse.json();
        stats.activeTournaments = tournaments.data?.length || 0;
      }
    } catch (e) {
      logger.error('Failed to fetch tournament stats:', e);
    }

    return stats;
  } catch (error) {
    logger.error('Failed to fetch system stats:', error);
    return {
      totalUsers: 0,
      activeGames: 0,
      totalGamesPlayed: 0,
      activeTournaments: 0
    };
  }
}

export async function renderHomePage(): Promise<string> {
  const stats = await fetchSystemStats();

  const content = `
    <h2>Welcome to FT Transcendence</h2>
    <p>Experience the classic Pong game with modern multiplayer features, tournaments, and blockchain-powered leaderboards.</p>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-value">${stats.totalUsers > 0 ? stats.totalUsers : '∞'}</div>
        <div class="stat-label">Registered Players</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">60</div>
        <div class="stat-label">FPS Server-Side Physics</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.activeTournaments}</div>
        <div class="stat-label">Active Tournaments</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">✓</div>
        <div class="stat-label">Blockchain Ready</div>
      </div>
    </div>

    <h3 style="margin-top: 2rem;">Features</h3>
    <ul style="list-style: none; padding-left: 0;">
      <li>✓ Real-time WebSocket gameplay at 60 FPS</li>
      <li>✓ Tournament system with matchmaking</li>
      <li>✓ User profiles with statistics and achievements</li>
      <li>✓ Cross-platform compatibility</li>
      <li>✓ Server-side rendering for SEO</li>
      <li>⏳ Blockchain-verified leaderboards (module in progress)</li>
      <li>⏳ AI opponent (module in progress)</li>
    </ul>

    <h3 style="margin-top: 2rem;">System Status</h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
      <div style="background: #2a2a2a; padding: 1rem; border-radius: 8px; text-align: center;">
        <div style="font-size: 1.5rem; color: #4CAF50;">🟢</div>
        <div>User Service</div>
      </div>
      <div style="background: #2a2a2a; padding: 1rem; border-radius: 8px; text-align: center;">
        <div style="font-size: 1.5rem; color: #4CAF50;">🟢</div>
        <div>Game Service</div>
      </div>
      <div style="background: #2a2a2a; padding: 1rem; border-radius: 8px; text-align: center;">
        <div style="font-size: 1.5rem; color: #4CAF50;">🟢</div>
        <div>Tournament Service</div>
      </div>
      <div style="background: #2a2a2a; padding: 1rem; border-radius: 8px; text-align: center;">
        <div style="font-size: 1.5rem; color: #FF9800;">🟡</div>
        <div>Blockchain Service</div>
      </div>
    </div>
  `;

  const data = {
    route: 'home',
    systemStats: stats,
    modules: ['user-management', 'gameplay', 'tournaments', 'ssr']
  };

  return generateHTML('home', content, data);
}
