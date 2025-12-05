// ssr-service/src/renderers/gameRenderer.ts
import { generateHTML } from '../utils/template.js';

export async function renderGamePage(): Promise<string> {
  const content = `
    <h2>Game Arena</h2>
    <p>Prepare for real-time Pong action with server-side physics at 60 FPS.</p>
    
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-value">🎮</div>
        <div class="stat-label">Ready to Play</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">2</div>
        <div class="stat-label">Players Per Match</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">&lt;50ms</div>
        <div class="stat-label">Average Latency</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">WebSocket</div>
        <div class="stat-label">Real-time Protocol</div>
      </div>
    </div>
    
    <h3 style="margin-top: 2rem;">Game Modes</h3>
    <ul style="list-style: none; padding-left: 0;">
      <li>🏆 <strong>Multiplayer:</strong> Challenge other players in real-time</li>
      <li>🤖 <strong>AI Opponent:</strong> Practice against intelligent bots</li>
      <li>🎯 <strong>Tournament:</strong> Compete in bracket-style competitions</li>
      <li>📈 <strong>Campaign:</strong> Progress through 21 challenging levels</li>
    </ul>
    
    <div style="margin-top: 2rem; padding: 1rem; background: #2a2a2a; border-radius: 8px;">
      <h4>Controls</h4>
      <p><strong>Player 1:</strong> W (Up) / S (Down)</p>
      <p><strong>Player 2:</strong> ↑ (Up) / ↓ (Down)</p>
    </div>
  `;

  const data = {
    route: 'game',
    gameReady: true,
    modes: ['multiplayer', 'ai', 'tournament', 'campaign']
  };

  return generateHTML('game', content, data);
}
