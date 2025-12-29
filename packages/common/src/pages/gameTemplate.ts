// Hoach edited: Create shared game page template for SSR + Frontend hydration
export interface GamePageData {
  route: string;
  gameReady: boolean;
  modes: string[];
}

export function renderGamePageTemplate(data: GamePageData): string {
  // Hoach edited: Game page template shared between SSR and frontend
  const content = `
    <div id="game-page" class="w-full h-full bg-black text-white p-8">
      <h2 class="text-3xl font-bold mb-6">Game Arena</h2>
      <p class="text-gray-300 mb-8">Prepare for real-time Pong action with server-side physics at 60 FPS.</p>
      
      <div class="stat-grid grid grid-cols-4 gap-4 mb-8">
        <div class="stat-card bg-gray-900 p-6 rounded-lg text-center">
          <div class="stat-value text-4xl mb-2">🎮</div>
          <div class="stat-label text-sm">Ready to Play</div>
        </div>
        <div class="stat-card bg-gray-900 p-6 rounded-lg text-center">
          <div class="stat-value text-4xl mb-2">2</div>
          <div class="stat-label text-sm">Players Per Match</div>
        </div>
        <div class="stat-card bg-gray-900 p-6 rounded-lg text-center">
          <div class="stat-value text-4xl mb-2">&lt;50ms</div>
          <div class="stat-label text-sm">Average Latency</div>
        </div>
        <div class="stat-card bg-gray-900 p-6 rounded-lg text-center">
          <div class="stat-value text-4xl mb-2">⚡</div>
          <div class="stat-label text-sm">WebSocket</div>
        </div>
      </div>
      
      <h3 class="text-2xl font-bold mb-4" style="margin-top: 2rem;">Game Modes</h3>
      <ul class="list-none pl-0 space-y-3 mb-8">
        <li class="flex items-start">
          <span class="mr-3">🏆</span>
          <div><strong>Multiplayer:</strong> Challenge other players in real-time</div>
        </li>
        <li class="flex items-start">
          <span class="mr-3">🤖</span>
          <div><strong>AI Opponent:</strong> Practice against intelligent bots</div>
        </li>
        <li class="flex items-start">
          <span class="mr-3">🎯</span>
          <div><strong>Tournament:</strong> Compete in bracket-style competitions</div>
        </li>
        <li class="flex items-start">
          <span class="mr-3">📈</span>
          <div><strong>Campaign:</strong> Progress through 21 challenging levels</div>
        </li>
      </ul>
      
      <div class="controls-box bg-gray-900 p-6 rounded-lg" style="margin-top: 2rem;">
        <h4 class="text-lg font-bold mb-4">Controls</h4>
        <p class="mb-2"><strong>Player 1:</strong> W (Up) / S (Down)</p>
        <p class="mb-2"><strong>Player 2:</strong> ↑ (Up) / ↓ (Down)</p>
        <p class="text-sm text-gray-400 mt-4">Status: ${data.gameReady ? 'Ready to Play ✅' : 'Initializing...'}</p>
      </div>
    </div>
  `;
  
  return content;
}
// Hoach edited end
