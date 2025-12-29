import { AbstractComponent } from "../components/AbstractComponent";
import { App } from "../core/App";
import { AuthService } from "../services/AuthService";
import { ProfileService, UserProfile, GameStats, AIStats, RecentGame, TournamentRanking } from "../services/ProfileService";
import { FriendService, Friend } from "../services/FriendService";
import { LocalPlayerService } from "../services/LocalPlayerService";
import Chart from 'chart.js/auto';

export class ProfilePage extends AbstractComponent {
    private profile: UserProfile | null = null;
    private stats: GameStats | null = null;
    private history: RecentGame[] = [];
    private rankings: TournamentRanking[] = [];
    private friends: Array<Friend & { profile?: UserProfile }> = [];
    private isFriend: boolean = false;
    private friendStatus?: Friend;
    private aiStats: AIStats = { aiWins: 0, aiLosses: 0, humanWins: 0, humanLosses: 0 };

    private loading: boolean = true;
    private error: string | null = null;
    // isEditing removed
    private charts: Chart[] = [];

    getHtml(): string {
        return `
            <div class="w-full h-full bg-black flex flex-col relative font-vcr text-white overflow-hidden">
                <!-- Header -->
                <div class="p-4 border-b border-accent flex items-center justify-between bg-black/80 z-10">
                    <button id="back-btn" class="text-accent hover:text-white flex items-center gap-2">
                        <i class="fas fa-chevron-left"></i> BACK
                    </button>
                    <h1 class="text-xl tracking-widest text-shadow-neon">USER PROFILE</h1>
                    <div class="w-20"></div> <!-- Spacer -->
                </div>

                <div class="flex-1 overflow-y-auto custom-scrollbar p-8">
                    ${this.renderContent()}
                </div>
            </div>
        `;
    }

    private renderContent(): string {
        if (this.loading) {
            return `
                <div class="h-full flex flex-col items-center justify-center gap-4 animate-pulse">
                    <div class="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                    <div class="text-accent tracking-widest">ACCESSING DATABANKS...</div>
                </div>
            `;
        }

        if (this.error || !this.profile) {
            return `
                <div class="h-full flex flex-col items-center justify-center gap-4 text-red-500">
                    <i class="fas fa-exclamation-triangle text-4xl"></i>
                    <div class="text-xl">${this.error || 'User Not Found'}</div>
                </div>
            `;
        }

        const p = this.profile;
        const s = this.stats || { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0, averageGameDuration: 0 };



        return `
            <div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8" id="profile-content-root">
                
                <!-- LEFT COL: IDENTITY -->
                <div class="lg:col-span-1 space-y-6">
                    <!-- Profile Card -->
                    <div class="border border-accent p-6 bg-black/50 relative overflow-hidden group">
                        <div class="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"></div>
                        
                        <div class="flex flex-col items-center text-center">
                            <!-- Avatar -->
                            <div class="w-32 h-32 border-2 border-accent rounded-full mb-4 overflow-hidden relative shadow-[0_0_20px_rgba(41,182,246,0.5)]">
                                ${p.avatarUrl
                ? `<img src="${p.avatarUrl}" class="w-full h-full object-cover">`
                : `<div class="w-full h-full bg-gray-900 flex items-center justify-center text-4xl text-gray-600">${(p.username || '?').charAt(0).toUpperCase()}</div>`
            }
                            </div>
                            
                            <!-- Username -->
                            <h2 class="text-3xl font-bold text-accent mb-1">${p.username}</h2>
                            <div class="flex items-center justify-center gap-2 mb-4">
                                <div class="text-xs text-gray-500">ID: ${p.userId}</div>
                                ${this.renderOnlineStatus()}
                            </div>
                            
                            <div class="w-full h-px bg-accent/30 my-4"></div>
                            
                            <div class="w-full space-y-3 text-sm text-left">
                                <div class="flex justify-between">
                                    <span class="text-gray-500">MEMBER SINCE</span>
                                    <span>${new Date(p.createdAt).toLocaleDateString()}</span>
                                </div>
                                
                                <!-- Country -->
                                <div class="flex justify-between">
                                         <span class="text-gray-500">COUNTRY</span>
                                         <span>${p.country || 'Unknown'}</span>
                                       </div>

                                <!-- Bio -->
                                ${p.bio ? `<div class="pt-2 text-gray-400 italic text-xs text-center">"${p.bio}"</div>` : ''}

                                <div class="flex justify-between pt-2">
                                    <span class="text-yellow-400">Level ${p.campaignLevel || 1}</span>
                                </div>
                                
                                <!-- Actions -->
                                <div class="pt-4 flex flex-col gap-3">
                                    ${this.renderActionButtons(p)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Friends List (Only for own profile) -->
                    ${this.renderFriendsList()}

                    <!-- Tournament Brief -->
                    <div class="border border-purple-500/50 p-6 bg-black/50">
                        <h3 class="text-purple-400 font-bold mb-4 flex items-center gap-2">
                            <i class="fas fa-trophy"></i> TOURNAMENTS
                        </h3>
                        <div class="grid grid-cols-2 gap-4 text-center">
                            <div class="bg-purple-900/20 p-2 rounded">
                                <div class="text-2xl font-bold">${this.rankings.length}</div>
                                <div class="text-[10px] text-gray-400">PARTICIPATION</div>
                            </div>
                            <div class="bg-yellow-900/20 p-2 rounded">
                                <div class="text-2xl font-bold text-yellow-500">${this.rankings.filter(r => r.isWinner).length}</div>
                                <div class="text-[10px] text-gray-400">VICTORIES</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- RIGHT COL: STATS & HISTORY -->
                <div class="lg:col-span-2 space-y-6">
                    
                    <!-- Stats Grid -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="border border-green-500/30 p-4 bg-green-900/5 text-center">
                            <div class="text-3xl font-bold text-green-400">${s.wins}</div>
                            <div class="text-xs text-gray-400 uppercase">Wins</div>
                        </div>
                        <div class="border border-red-500/30 p-4 bg-red-900/5 text-center">
                            <div class="text-3xl font-bold text-red-400">${s.losses}</div>
                            <div class="text-xs text-gray-400 uppercase">Losses</div>
                        </div>
                        <div class="border border-accent/30 p-4 bg-accent/5 text-center">
                            <div class="text-3xl font-bold text-white">${s.totalGames}</div>
                            <div class="text-xs text-gray-400 uppercase">Total Games</div>
                        </div>
                        <div class="border border-yellow-500/30 p-4 bg-yellow-900/5 text-center">
                            <div class="text-3xl font-bold text-yellow-400">${s.winRate.toFixed(1)}%</div>
                            <div class="text-xs text-gray-400 uppercase">Win Rate</div>
                        </div>
                    </div>

                    <!-- Stats Visualizations -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Win Rate Trend -->
                        <div class="border border-white/20 bg-black/50 p-4">
                            <h3 class="text-xs text-gray-400 font-bold mb-2 uppercase">Performance Trend</h3>
                             <div class="relative h-48 w-full">
                                <canvas id="winRateChart"></canvas>
                             </div>
                        </div>
                        
                        <!-- Outcome Distribution -->
                         <div class="border border-white/20 bg-black/50 p-4">
                             <h3 class="text-xs text-gray-400 font-bold mb-2 uppercase">Match Outcomes</h3>
                             <div class="relative h-48 w-full flex items-center justify-center">
                                <canvas id="outcomeChart"></canvas>
                             </div>
                        </div>
                    </div>

                    <!-- AI vs Human Stats -->
                    <div class="border border-cyan-500/30 p-4 bg-cyan-900/5">
                        <h3 class="text-cyan-400 font-bold mb-4 flex items-center gap-2">
                            <i class="fas fa-robot"></i> AI vs HUMAN BREAKDOWN
                        </h3>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div class="bg-cyan-900/20 p-3 rounded">
                                <div class="text-2xl font-bold text-green-400">${this.aiStats.aiWins}</div>
                                <div class="text-[10px] text-gray-400">AI WINS</div>
                            </div>
                            <div class="bg-cyan-900/20 p-3 rounded">
                                <div class="text-2xl font-bold text-red-400">${this.aiStats.aiLosses}</div>
                                <div class="text-[10px] text-gray-400">AI LOSSES</div>
                            </div>
                            <div class="bg-purple-900/20 p-3 rounded">
                                <div class="text-2xl font-bold text-green-400">${this.aiStats.humanWins}</div>
                                <div class="text-[10px] text-gray-400">HUMAN WINS</div>
                            </div>
                            <div class="bg-purple-900/20 p-3 rounded">
                                <div class="text-2xl font-bold text-red-400">${this.aiStats.humanLosses}</div>
                                <div class="text-[10px] text-gray-400">HUMAN LOSSES</div>
                            </div>
                        </div>
                    </div>
                    <!-- Recent Activity -->
                    <div class="border border-white/20">
                        <div class="bg-white/5 p-3 border-b border-white/20 font-bold flex justify-between">
                            <span>RECENT ACTIVITY</span>
                            <span class="text-xs bg-accent text-black px-2 py-0.5 rounded">LAST 20</span>
                        </div>
                        <div class="divide-y divide-white/10 max-h-[400px] overflow-y-auto">
                            ${this.history.length > 0 ? this.history.map(g => this.renderGameRow(g)).join('') : '<div class="p-8 text-center text-gray-500">No match history available</div>'}
                        </div>
                    </div>

                    <!-- Tournament History -->
                    <div class="border border-white/20">
                        <div class="bg-white/5 p-3 border-b border-white/20 font-bold text-purple-400">
                            TOURNAMENT RECORD
                        </div>
                        <div class="divide-y divide-white/10 max-h-[200px] overflow-y-auto">
                            ${this.rankings.length > 0 ? this.rankings.map(r => this.renderTournamentRow(r)).join('') : '<div class="p-8 text-center text-gray-500">No tournament records found</div>'}
                        </div>
                    </div>

                </div>
            </div>
        `;
    }

    private renderOnlineStatus(): string {
        const currentUser = AuthService.getInstance().getCurrentUser();
        const localPlayers = LocalPlayerService.getInstance().getLocalPlayers();
        if (!this.profile) return '';

        let isOnline = false;

        // 1. If checking self (main logged-in user)
        if (currentUser && currentUser.userId === this.profile.userId) {
            isOnline = true; // Always online if I'm viewing myself
        }
        // 2. If this profile belongs to a local player on this device, they're "online"
        else if (localPlayers.some(lp => lp.userId === this.profile?.userId)) {
            isOnline = true;
        }
        // 3. Use the status we computed in loadProfile (from backend)
        else if (this.friendStatus) {
            isOnline = this.friendStatus.isOnline;
        }

        if (isOnline) {
            return `<div class="px-2 py-0.5 rounded bg-green-500/20 border border-green-500 text-[10px] text-green-500 font-bold tracking-wider">ONLINE</div>`;
        } else {
            return `<div class="px-2 py-0.5 rounded bg-gray-500/20 border border-gray-500 text-[10px] text-gray-500 font-bold tracking-wider">OFFLINE</div>`;
        }
    }

    private renderActionButtons(p: UserProfile): string {
        // Check if the viewed profile corresponds to ANY locally logged in player (or the main auth user)
        const currentUser = AuthService.getInstance().getCurrentUser();
        const isMainUser = currentUser && currentUser.userId === p.userId;

        // Check local players for bot status if p doesn't have it explicitly
        let isBot = p.userId === 0 || (p as any).isBot === true;
        if (!isBot && p.userId > 100000) { // Heuristic for local bots
            const localPlayers = LocalPlayerService.getInstance().getLocalPlayers();
            const localP = localPlayers.find(lp => lp.userId === p.userId);
            if (localP && localP.isBot) isBot = true;
            // Also assume high IDs are bots if not found in local (e.g. from history)
            if (!localP) isBot = true;
        }

        let buttons = '';

        const showFriendButton = !isMainUser && !isBot; // Show for everyone except main user and bots

        if (showFriendButton) {
            if (this.isFriend) {
                buttons += `
                    <button id="remove-friend-btn" class="w-full py-3 border border-red-500/30 text-red-500 hover:bg-red-500/10 font-bold text-sm tracking-widest transition-all mb-2">
                        <i class="fas fa-user-minus mr-2"></i>REMOVE FRIEND
                    </button>
                `;
            } else {
                buttons += `
                    <button id="add-friend-btn" class="w-full py-3 bg-transparent border border-green-500 text-green-500 hover:bg-green-500 hover:text-black font-bold text-sm tracking-widest transition-all mb-2">
                        <i class="fas fa-user-plus mr-2"></i>ADD FRIEND
                    </button>
                `;
            }
        }

        return buttons;
    }

    private renderFriendsList(): string {
        // Render for everyone, just change title if it's not "my" friends
        const currentUser = AuthService.getInstance().getCurrentUser();
        const localPlayers = LocalPlayerService.getInstance().getLocalPlayers();
        const isOwn = currentUser && this.profile && currentUser.userId === this.profile.userId;

        return `
            <div class="border border-green-500/50 p-6 bg-black/50">
                <h3 class="text-green-400 font-bold mb-4 flex items-center gap-2">
                    <i class="fas fa-users"></i> ${isOwn ? 'MY FRIENDS' : 'FRIENDS'} (${this.friends.length})
                </h3>
                <div class="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    ${this.friends.length > 0
                ? this.friends.map(f => {
                    const name = f.profile?.username || f.username;
                    // Only use profile avatar if it exists, don't fall back to generic "User" one if avoidable
                    const avatar = f.profile?.avatarUrl;
                    const displayAvatar = avatar
                        ? `url('${avatar}')`
                        : `linear-gradient(to bottom right, #333, #111)`;

                    // Check if this friend is a local player on this device - if so, they're online
                    const isLocalPlayer = localPlayers.some(lp => lp.userId === f.userId);
                    const friendOnline = isLocalPlayer || f.isOnline;

                    return `
                        <div class="flex items-center justify-between p-2 bg-white/5 rounded hover:bg-white/10 transition-colors cursor-pointer" onclick="window.history.pushState({}, '', '/profile?id=${f.userId}'); window.dispatchEvent(new Event('popstate'));">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-cover bg-center border border-white/20" style="background-image: ${displayAvatar};">
                                    ${!avatar ? `<div class="w-full h-full flex items-center justify-center text-[10px] text-gray-500">${name.charAt(0).toUpperCase()}</div>` : ''}
                                </div>
                                <span class="text-sm font-bold text-gray-200">${name}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] ${friendOnline ? 'text-green-400' : 'text-gray-500'}">${friendOnline ? 'ONLINE' : 'OFFLINE'}</span>
                                <div class="w-2 h-2 rounded-full ${friendOnline ? 'bg-green-500 shadow-[0_0_8px_#4ade80]' : 'bg-gray-600'}"></div>
                            </div>
                        </div>
                    `;
                }).join('')
                : '<div class="text-xs text-gray-500 text-center py-4">No friends found.</div>'
            }
                </div>
            </div>
        `;
    }

    private renderGameRow(g: RecentGame): string {
        const date = new Date(g.date).toLocaleDateString();
        const colorClass = g.result === 'win' ? 'text-green-400' : (g.result === 'draw' ? 'text-gray-400' : 'text-red-400');
        const bgHover = g.result === 'win' ? 'hover:bg-green-900/10' : 'hover:bg-red-900/10';

        return `
            <div class="p-3 flex items-center justify-between ${bgHover} transition-colors cursor-pointer group"
                onclick="window.history.pushState({}, '', '/match-details?id=${g.id}'); window.dispatchEvent(new Event('popstate'));">
                <div class="flex flex-col">
                    <span class="text-sm font-bold ${colorClass}">${g.result.toUpperCase()}</span>
                    <span class="text-[10px] text-gray-500">${g.gameMode.toUpperCase()} • ${date}</span>
                    ${g.teammates ? `<span class="text-[9px] text-accent/70">W/ ${g.teammates.toUpperCase()}</span>` : ''}
                </div>
                <div class="flex items-center gap-4">
                    <div class="text-right">
                        <span class="text-sm text-gray-300 block">vs ${g.opponent}</span>
                        <span class="text-[10px] text-accent opacity-0 group-hover:opacity-100 transition-opacity">VIEW DETAILS ></span>
                    </div>
                    <span class="text-lg font-bold font-mono ${colorClass}">${g.score}</span>
                </div>
            </div>
        `;
    }

    private renderTournamentRow(r: TournamentRanking): string {
        const icon = r.isWinner ? '🏆' : (typeof r.rank === 'number' && r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : '#' + r.rank);
        return `
            <div class="p-3 flex items-center justify-between hover:bg-purple-900/10 transition-colors">
                <div class="flex flex-col">
                    <span class="text-sm font-bold text-white">${r.tournamentName}</span>
                    <span class="text-[10px] text-gray-500">${new Date(r.date).toLocaleDateString()}</span>
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-xs text-gray-400">${r.status.toUpperCase()}</span>
                    <span class="text-lg" title="Rank">${icon}</span>
                </div>
            </div>
        `;
    }

    async onMounted(): Promise<void> {
        console.log('Mounting ProfilePage');
        this.$('#back-btn')?.addEventListener('click', () => {
            App.getInstance().router.navigateTo('/main-menu');
        });

        const params = new URLSearchParams(window.location.search);
        const idParam = params.get('id');
        let userId: number;

        if (idParam) {
            userId = parseInt(idParam);
        } else {
            const currentUser = AuthService.getInstance().getCurrentUser();
            if (currentUser) {
                userId = currentUser.userId;
            } else {
                this.error = "No user specified and not logged in";
                this.loading = false;
                this.refresh();
                return;
            }
        }

        await this.loadProfile(userId);
        this.initCharts();
    }

    private initCharts(): void {
        if (!this.stats) return;

        // Cleanup old charts
        this.charts.forEach(c => c.destroy());
        this.charts = [];

        // 1. Win Rate Trend Chart
        const winRateCanvas = document.getElementById('winRateChart') as HTMLCanvasElement;
        if (winRateCanvas) {
            const dataMetadata = this.calculateWinRateTrend();

            this.charts.push(new Chart(winRateCanvas, {
                type: 'line',
                data: {
                    labels: dataMetadata.labels,
                    datasets: [{
                        label: 'Win Rate %',
                        data: dataMetadata.data,
                        borderColor: '#29b6f6', // Accent color
                        backgroundColor: 'rgba(41, 182, 246, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        pointBackgroundColor: '#000',
                        pointBorderColor: '#29b6f6',
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            ticks: { color: '#888' }
                        },
                        x: {
                            display: false // Hide x-axis labels to keep it clean
                        }
                    }
                }
            }));
        }

        // 2. Outcome Distribution Chart
        const outcomeCanvas = document.getElementById('outcomeChart') as HTMLCanvasElement;
        if (outcomeCanvas) {
            this.charts.push(new Chart(outcomeCanvas, {
                type: 'doughnut',
                data: {
                    labels: ['Wins', 'Losses'],
                    datasets: [{
                        data: [this.stats.wins, this.stats.losses],
                        backgroundColor: [
                            'rgba(74, 222, 128, 0.8)', // Green-400
                            'rgba(248, 113, 113, 0.8)', // Red-400
                        ],
                        borderColor: '#000',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: { color: '#fff', font: { family: 'PixelCode' } }
                        }
                    }
                }
            }));
        }
    }

    private calculateWinRateTrend(): { labels: string[], data: number[] } {
        // Need to process history in chronological order (oldest -> newest)
        // History is typically Newest -> Oldest, so reverse it
        const chronoGames = [...this.history].reverse();

        let wins = 0;
        let total = 0;
        const labels: string[] = [];
        const data: number[] = [];

        // If we want a "start state", maybe assume 0% or extend previous?
        // Let's just plot points per game
        chronoGames.forEach((game, index) => {
            total++;
            if (game.result === 'win') wins++;

            const rate = (wins / total) * 100;
            labels.push(`Game ${index + 1}`);
            data.push(rate);
        });

        // If no games, just show flat 0
        if (data.length === 0) {
            return { labels: ['Start'], data: [0] };
        }

        return { labels, data };
    }

    private async loadProfile(userId: number): Promise<void> {
        try {
            console.log('Fetching profile data for user', userId);
            const service = ProfileService.getInstance();

            // Parallel fetch
            const [profile, stats, history, rankings] = await Promise.all([
                service.getUserProfile(userId),
                service.getGameStats(userId),
                service.getRecentGames(userId),
                service.getTournamentRankings(userId)
            ]);

            // Friend Logic & Online Status
            const currentUser = AuthService.getInstance().getCurrentUser();
            const friendService = FriendService.getInstance();

            // 1. Fetch Friends List for the Profile being viewed (Everyone can see friends now)
            try {
                const friendList = await friendService.getFriends(userId);
                // Enhance friend list with profile data
                this.friends = await Promise.all(friendList.map(async f => {
                    // Optimized: In a real app, we might not want to fetch profile for every friend if list is huge.
                    // But for now, we do it to get avatars.
                    try {
                        const p = await service.getUserProfile(f.userId);
                        return { ...f, profile: p || undefined, username: p?.username || `User ${f.userId}` };
                    } catch {
                        return f;
                    }
                }));
            } catch (e) {
                console.warn('Failed to load friends for user', userId, e);
                this.friends = [];
            }

            // 2. Check "My Friendship Status" with this user
            if (currentUser && currentUser.userId !== userId) {
                const myFriends = await friendService.getFriends(currentUser.userId);
                const friendRecord = myFriends.find(f => f.userId == userId);

                if (friendRecord) {
                    this.isFriend = true;
                    this.friendStatus = friendRecord;
                } else {
                    this.isFriend = false;
                    this.friendStatus = undefined;
                }
            } else {
                this.isFriend = false;
            }

            // 3. Check Online Status for the Profile being viewed
            // We fetch all online users and check if this user is in the list
            const onlineUsers = await friendService.getOnlineUsers();
            const isProfileOnline = onlineUsers.includes(userId);

            // Start constructing the 'status' object even if not a friend, so renderOnlineStatus works
            if (!this.friendStatus) {
                this.friendStatus = {
                    userId: userId,
                    username: profile?.username || 'User',
                    isOnline: isProfileOnline
                };
            } else {
                this.friendStatus.isOnline = isProfileOnline;
            }

            this.profile = profile;
            this.stats = stats;
            this.history = history;
            this.rankings = rankings;

            // Compute AI stats from history
            this.aiStats = { aiWins: 0, aiLosses: 0, humanWins: 0, humanLosses: 0 };
            for (const game of this.history) {
                const isAIGame = game.opponent === 'AI' || game.opponent.toLowerCase().includes('ai');
                if (isAIGame) {
                    if (game.result === 'win') this.aiStats.aiWins++;
                    else if (game.result === 'loss') this.aiStats.aiLosses++;
                } else {
                    if (game.result === 'win') this.aiStats.humanWins++;
                    else if (game.result === 'loss') this.aiStats.humanLosses++;
                }
            }

            if (!this.profile) {
                this.error = "User profile not found";
            } else {
                console.log('Profile loaded:', this.profile);
            }

        } catch (e) {
            console.error("Profile load error", e);
            this.error = "Failed to load profile data. " + (e instanceof Error ? e.message : String(e));
        } finally {
            this.loading = false;
            this.refresh();
        }
    }

    private bindEvents(): void {
        this.$('#back-btn')?.addEventListener('click', () => {
            App.getInstance().router.navigateTo('/main-menu');
        });

        // Friend Actions
        this.$('#add-friend-btn')?.addEventListener('click', async () => {
            if (!this.profile) return;
            const currentUser = AuthService.getInstance().getCurrentUser();
            if (!currentUser) return;

            const success = await FriendService.getInstance().addFriend(currentUser.userId, this.profile.userId);
            if (success) {
                // Reload profile/friends list to get updated status/online state
                await this.loadProfile(this.profile.userId);
            } else {
                alert('Failed to add friend');
            }
        });

        this.$('#remove-friend-btn')?.addEventListener('click', async () => {
            if (!this.profile) return;
            const currentUser = AuthService.getInstance().getCurrentUser();
            if (!currentUser) return;

            if (confirm(`Remove ${this.profile.username} from friends?`)) {
                const success = await FriendService.getInstance().removeFriend(currentUser.userId, this.profile.userId);
                if (success) {
                    // Reload profile to update status
                    await this.loadProfile(this.profile.userId);
                } else {
                    alert('Failed to remove friend');
                }
            }
        });
    }


    private refresh(): void {
        const container = this.container;
        if (container) {
            container.innerHTML = this.getHtml();
            this.bindEvents(); // Re-bind events
            this.initCharts(); // Re-init charts
        }
    }

    // Cleanup to destroy chart instances when parsing out
    disconnect(): void {
        this.charts.forEach(c => c.destroy());
        this.charts = [];
    }
}
