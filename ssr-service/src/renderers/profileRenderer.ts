// ssr-service/src/renderers/profileRenderer.ts
import { generateHTML } from '../utils/template.js';

export async function renderProfilePage(userId: string): Promise<string> {
  // In a real implementation, fetch user data from user-service
  const content = `
    <h2>Player Profile</h2>
    <p>User ID: ${userId}</p>
    
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-value">--</div>
        <div class="stat-label">Total Wins</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">--</div>
        <div class="stat-label">Total Losses</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">--%</div>
        <div class="stat-label">Win Rate</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">#--</div>
        <div class="stat-label">Global Rank</div>
      </div>
    </div>
    
    <h3 style="margin-top: 2rem;">Recent Matches</h3>
    <p style="color: #888;">Loading match history...</p>
    
    <h3 style="margin-top: 2rem;">Achievements</h3>
    <ul style="list-style: none; padding-left: 0;">
      <li>🏅 First Victory</li>
      <li>🎯 Tournament Champion</li>
      <li>🤖 AI Challenger</li>
      <li>📊 Data Analyst</li>
    </ul>
  `;

  const data = {
    route: 'profile',
    userId,
    placeholder: true
  };

  return generateHTML('profile', content, data);
}
