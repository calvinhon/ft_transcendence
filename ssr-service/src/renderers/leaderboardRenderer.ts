// ssr-service/src/renderers/leaderboardRenderer.ts
import { generateHTML } from '../utils/template.js';

async function fetchGlobalLeaderboard(): Promise<any[]> {
  try {
    // Try to fetch from tournament service for active tournaments
    const response = await fetch('http://tournament-service:3004/tournaments/active');
    if (!response.ok) throw new Error('No active tournaments');

    const tournaments = await response.json();
    if (!tournaments.data || tournaments.data.length === 0) {
      throw new Error('No active tournaments');
    }

    // Get leaderboard for the first active tournament
    const tournamentId = tournaments.data[0].id;
    const leaderboardResponse = await fetch(`http://tournament-service:3004/tournaments/${tournamentId}/leaderboard`);
    if (!leaderboardResponse.ok) throw new Error('Failed to fetch leaderboard');

    const leaderboard = await leaderboardResponse.json();
    return leaderboard.data || [];
  } catch (error) {
    console.error('Failed to fetch global leaderboard:', error);
    return [];
  }
}

export async function renderLeaderboardPage(): Promise<string> {
  const leaderboard = await fetchGlobalLeaderboard();

  const leaderboardHtml = leaderboard.length > 0
    ? leaderboard.map((entry: any, index: number) => `
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #3a3a3a; display: flex; justify-content: space-between;">
          <span><strong>${index + 1}.</strong> ${entry.username || entry.display_name || `User ${entry.user_id}`}</span>
          <span style="color: #4CAF50;">${entry.score || entry.wins || 0} pts</span>
        </li>
      `).join('')
    : `
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #3a3a3a;">
          <strong>🏆 Blockchain Leaderboard Coming Soon</strong>
        </li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid #3a3a3a;">
          Tournament scores will be verified on Avalanche blockchain
        </li>
        <li style="padding: 0.5rem 0;">
          <em>Complete the Blockchain module to enable global rankings</em>
        </li>
      `;

  const content = `
    <h2>Global Leaderboard</h2>
    <p>Top players ranked by tournament performance. Future: Blockchain-verified rankings on Avalanche.</p>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-value">⛓️</div>
        <div class="stat-label">Blockchain Ready</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${leaderboard.length || '?'}</div>
        <div class="stat-label">Active Players</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">🏆</div>
        <div class="stat-label">Tournament Mode</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">📊</div>
        <div class="stat-label">Live Rankings</div>
      </div>
    </div>

    <h3 style="margin-top: 2rem;">Current Tournament Rankings</h3>
    <div style="background: #2a2a2a; padding: 1rem; border-radius: 8px;">
      <ul style="list-style: none; padding-left: 0; margin-top: 1rem;">
        ${leaderboardHtml}
      </ul>
    </div>

    <div style="margin-top: 2rem; padding: 1rem; background: #1a1a1a; border-radius: 8px; border-left: 4px solid #667eea;">
      <h4>🚀 Future Features</h4>
      <ul style="color: #ccc; margin-top: 0.5rem;">
        <li>• Blockchain-verified scores on Avalanche</li>
        <li>• Global player rankings across all tournaments</li>
        <li>• Historical performance tracking</li>
        <li>• Achievement-based leaderboards</li>
      </ul>
    </div>
  `;

  const data = {
    route: 'leaderboard',
    blockchain: false, // Will be true when blockchain module is complete
    activeTournament: leaderboard.length > 0,
    playerCount: leaderboard.length
  };

  return generateHTML('leaderboard', content, data);
}
