// Hoach edited: Create shared home page template for SSR + Frontend hydration
export interface HomePageData {
  route: string;
  features: string[];
}

export function renderHomePageTemplate(data: HomePageData): string {
  // Hoach edited: Home page template shared between SSR and frontend
  const content = `
    <div id="home-page" class="w-full h-full bg-black text-white p-8">
      <h1 class="text-4xl font-bold mb-4">ft_transcendence</h1>
      <p class="text-xl text-gray-300 mb-8">Ultimate Online Pong Experience - Real-time Multiplayer Gaming</p>
      
      <div class="features-grid grid grid-cols-2 gap-6 mb-12">
        <div class="feature-card bg-gray-900 p-6 rounded-lg">
          <div class="text-3xl mb-3">🎮</div>
          <h3 class="text-lg font-bold mb-2">Real-time Gameplay</h3>
          <p class="text-gray-300">Experience smooth, lag-free Pong matches with 60 FPS server-side physics</p>
        </div>
        
        <div class="feature-card bg-gray-900 p-6 rounded-lg">
          <div class="text-3xl mb-3">🏆</div>
          <h3 class="text-lg font-bold mb-2">Tournaments</h3>
          <p class="text-gray-300">Compete in bracket-style tournaments and climb the global leaderboard</p>
        </div>
        
        <div class="feature-card bg-gray-900 p-6 rounded-lg">
          <div class="text-3xl mb-3">🤖</div>
          <h3 class="text-lg font-bold mb-2">AI Opponents</h3>
          <p class="text-gray-300">Test your skills against intelligent AI opponents with multiple difficulty levels</p>
        </div>
        
        <div class="feature-card bg-gray-900 p-6 rounded-lg">
          <div class="text-3xl mb-3">📊</div>
          <h3 class="text-lg font-bold mb-2">Statistics</h3>
          <p class="text-gray-300">Track your performance with detailed match history and player statistics</p>
        </div>
      </div>
      
      <div class="stats-section bg-gray-900 p-8 rounded-lg mb-8">
        <h2 class="text-2xl font-bold mb-6">Platform Statistics</h2>
        <div class="stats-grid grid grid-cols-3 gap-6">
          <div class="stat">
            <div class="text-3xl font-bold text-blue-400">2000+</div>
            <div class="text-gray-300">Active Players</div>
          </div>
          <div class="stat">
            <div class="text-3xl font-bold text-green-400">50K+</div>
            <div class="text-gray-300">Matches Played</div>
          </div>
          <div class="stat">
            <div class="text-3xl font-bold text-purple-400">&lt;50ms</div>
            <div class="text-gray-300">Avg Latency</div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  return content;
}
// Hoach edited end
