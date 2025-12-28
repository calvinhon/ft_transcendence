// ssr-service/src/renderers/profileRenderer.ts
import { generateHTML } from '../utils/template.js';
import { createLogger } from '@ft-transcendence/common';

const logger = createLogger('SSR-SERVICE');

interface UserProfile {
  id: number;
  user_id: number;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  preferred_language: string;
  theme_preference: string;
  notification_settings: string;
  privacy_settings: string;
  created_at: string;
  updated_at: string;
}

interface GameStats {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
}

interface RecentGame {
  id: number;
  player1_id: number;
  player2_id: number;
  player1_score: number;
  player2_score: number;
  winner_id?: number;
  game_mode?: string;
  started_at: string;
  finished_at?: string;
  player1_name?: string;
  player2_name?: string;
}

async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const response = await fetch(`http://user-service:3000/profile/${userId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    logger.error('Failed to fetch user profile:', error);
    return null;
  }
}

async function fetchGameStats(userId: string): Promise<GameStats | null> {
  try {
    const response = await fetch(`http://game-service:3000/stats/${userId}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.data || data; // handle nested response
  } catch (error) {
    logger.error('Failed to fetch game stats:', error);
    return null;
  }
}

async function fetchRecentGames(userId: string): Promise<RecentGame[]> {
  try {
    const response = await fetch(`http://game-service:3000/history/${userId}?limit=5`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.data || data || [];
  } catch (error) {
    logger.error('Failed to fetch recent games:', error);
    return [];
  }
}

function formatGameResult(game: RecentGame, userId: number): string {
  const isPlayer1 = game.player1_id === userId;
  const userScore = isPlayer1 ? game.player1_score : game.player2_score;
  const opponentScore = isPlayer1 ? game.player2_score : game.player1_score;
  const opponentName = isPlayer1 ? (game.player2_name || `User ${game.player2_id}`) : (game.player1_name || `User ${game.player1_id}`);

  let result = 'Draw';
  if (game.winner_id === userId) result = 'Win';
  else if (game.winner_id && game.winner_id !== userId) result = 'Loss';

  return `${result} vs ${opponentName} (${userScore}-${opponentScore})`;
}

export async function renderProfilePage(userId: string): Promise<string> {
  const [profile, stats, recentGames] = await Promise.all([
    fetchUserProfile(userId),
    fetchGameStats(userId),
    fetchRecentGames(userId)
  ]);

  const displayName = profile?.display_name || `User ${userId}`;
  const winRate = stats ? Math.round(stats.winRate) : 0;

  const statsHtml = `
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-value">${stats?.wins || 0}</div>
        <div class="stat-label">Total Wins</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats?.losses || 0}</div>
        <div class="stat-label">Total Losses</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${winRate}%</div>
        <div class="stat-label">Win Rate</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">#--</div>
        <div class="stat-label">Global Rank</div>
      </div>
    </div>
  `;

  const recentGamesHtml = recentGames.length > 0
    ? recentGames.map(game => `
        <div class="game-item">
          <div class="game-result">${formatGameResult(game, parseInt(userId))}</div>
          <div class="game-mode">${game.game_mode || 'general'}</div>
          <div class="game-date">${new Date(game.finished_at || game.started_at).toLocaleDateString()}</div>
        </div>
      `).join('')
    : '<p style="color: #888;">No recent matches found.</p>';

  const content = `
    <h2>Player Profile</h2>
    <div class="profile-header">
      <div class="profile-avatar">
        ${profile?.avatar_url ? `<img src="${profile.avatar_url}" alt="Avatar" style="width: 80px; height: 80px; border-radius: 50%;">` : '<div style="width: 80px; height: 80px; border-radius: 50%; background: #333; display: flex; align-items: center; justify-content: center; font-size: 24px;">👤</div>'}
      </div>
      <div class="profile-info">
        <h3>${displayName}</h3>
        ${profile?.bio ? `<p>${profile.bio}</p>` : ''}
        ${profile?.country ? `<p>📍 ${profile.country}</p>` : ''}
        <p>Joined: ${profile ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}</p>
      </div>
    </div>

    ${statsHtml}

    <h3 style="margin-top: 2rem;">Recent Matches</h3>
    <div class="recent-games">
      ${recentGamesHtml}
    </div>
  `;

  const data = {
    route: 'profile',
    userId,
    placeholder: false
  };

  return generateHTML('profile', content, data);
}
