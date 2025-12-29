// Hoach edited: Create shared profile page template for SSR + Frontend hydration
export interface ProfileUserData {
  id: string;
  username: string;
  wins: number;
  losses: number;
  rating: number;
}

export interface ProfilePageData {
  route: string;
  user: ProfileUserData;
}

export function renderProfilePageTemplate(data: ProfilePageData): string {
  // Hoach edited: Profile page template shared between SSR and frontend
  const user = data.user;
  const winRate = user.wins + user.losses > 0 
    ? Math.round((user.wins / (user.wins + user.losses)) * 100)
    : 0;
  
  const content = `
    <div id="profile-page" class="w-full h-full bg-black text-white p-8">
      <div class="profile-header bg-gray-900 rounded-lg p-8 mb-8">
        <div class="flex items-center mb-6">
          <div class="profile-avatar text-5xl mr-6">👤</div>
          <div>
            <h1 class="text-3xl font-bold">${user.username}</h1>
            <p class="text-gray-400">Player ID: ${user.id}</p>
          </div>
        </div>
      </div>
      
      <div class="stats-grid grid grid-cols-4 gap-4 mb-8">
        <div class="stat-card bg-gray-900 p-6 rounded-lg text-center">
          <div class="stat-value text-3xl font-bold text-green-400 mb-2">${user.wins}</div>
          <div class="stat-label text-sm text-gray-300">Wins</div>
        </div>
        <div class="stat-card bg-gray-900 p-6 rounded-lg text-center">
          <div class="stat-value text-3xl font-bold text-red-400 mb-2">${user.losses}</div>
          <div class="stat-label text-sm text-gray-300">Losses</div>
        </div>
        <div class="stat-card bg-gray-900 p-6 rounded-lg text-center">
          <div class="stat-value text-3xl font-bold text-blue-400 mb-2">${winRate}%</div>
          <div class="stat-label text-sm text-gray-300">Win Rate</div>
        </div>
        <div class="stat-card bg-gray-900 p-6 rounded-lg text-center">
          <div class="stat-value text-3xl font-bold text-yellow-400 mb-2">${user.rating}</div>
          <div class="stat-label text-sm text-gray-300">Rating</div>
        </div>
      </div>
      
      <div class="profile-sections grid grid-cols-2 gap-6">
        <div class="achievements bg-gray-900 p-6 rounded-lg">
          <h2 class="text-2xl font-bold mb-4">Recent Achievements</h2>
          <div class="space-y-3">
            <div class="achievement bg-gray-800 p-4 rounded">
              <p class="text-lg">🏆 Tournament Winner</p>
              <p class="text-sm text-gray-400">Won a tournament match</p>
            </div>
            <div class="achievement bg-gray-800 p-4 rounded">
              <p class="text-lg">⚡ Streak Master</p>
              <p class="text-sm text-gray-400">Won 5 matches in a row</p>
            </div>
          </div>
        </div>
        
        <div class="quick-stats bg-gray-900 p-6 rounded-lg">
          <h2 class="text-2xl font-bold mb-4">Quick Stats</h2>
          <div class="space-y-3">
            <p class="flex justify-between">
              <span class="text-gray-300">Total Matches:</span>
              <span class="font-bold">${user.wins + user.losses}</span>
            </p>
            <p class="flex justify-between">
              <span class="text-gray-300">Current Streak:</span>
              <span class="font-bold">On Fire 🔥</span>
            </p>
            <p class="flex justify-between">
              <span class="text-gray-300">Rank:</span>
              <span class="font-bold text-purple-400">#42</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  return content;
}
// Hoach edited end
