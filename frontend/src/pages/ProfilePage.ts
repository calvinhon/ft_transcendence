import { AbstractComponent } from "../components/AbstractComponent";
import { App } from "../core/App";
import { AuthService } from "../services/AuthService";
import { ProfileService, UserProfile, GameStats, AIStats, RecentGame, TournamentRanking } from "../services/ProfileService";
import { Api } from "../core/Api";
import { PasswordConfirmationModal } from "../components/PasswordConfirmationModal";
import { LocalPlayerService } from "../services/LocalPlayerService";
import Chart from 'chart.js/auto';

export class ProfilePage extends AbstractComponent {
    private profile: UserProfile | null = null;
    private stats: GameStats | null = null;
    private history: RecentGame[] = [];
    private rankings: TournamentRanking[] = [];
    private aiStats: AIStats = { aiWins: 0, aiLosses: 0, humanWins: 0, humanLosses: 0 };

    private loading: boolean = true;
    private error: string | null = null;
    private isEditing: boolean = false; // State for inline editing
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
                             ${this.isEditing
                ? `<div class="w-full mb-4">
                                     <label class="text-[10px] text-gray-500 mb-1 block text-left">AVATAR URL</label>
                                     <input type="text" id="edit-avatar" value="${p.avatarUrl || ''}" class="w-full bg-black border border-accent/30 p-2 text-xs text-white focus:border-accent outline-none">
                                   </div>`
                : ''}
                            
                            <!-- Username -->
                            <h2 class="text-3xl font-bold text-accent mb-1">${p.username}</h2>
                            <div class="text-xs text-gray-500 mb-4">ID: ${p.userId}</div>
                            
                            <div class="w-full h-px bg-accent/30 my-4"></div>
                            
                            <div class="w-full space-y-3 text-sm text-left">
                                <div class="flex justify-between">
                                    <span class="text-gray-500">MEMBER SINCE</span>
                                    <span>${new Date(p.createdAt).toLocaleDateString()}</span>
                                </div>
                                
                                <!-- Country -->
                                ${this.isEditing
                ? `<div class="space-y-1">
                                         <label class="text-[10px] text-gray-500">COUNTRY</label>
                                         <input type="text" id="edit-country" value="${p.country || ''}" class="w-full bg-black border border-accent/30 p-2 text-white focus:border-accent outline-none">
                                       </div>`
                : `<div class="flex justify-between">
                                         <span class="text-gray-500">COUNTRY</span>
                                         <span>${p.country || 'Unknown'}</span>
                                       </div>`
            }

                                <!-- Bio -->
                                ${this.isEditing
                ? `<div class="space-y-1 pt-2">
                                          <label class="text-[10px] text-gray-500">BIO</label>
                                          <textarea id="edit-bio" rows="3" class="w-full bg-black border border-accent/30 p-2 text-white focus:border-accent outline-none text-xs" placeholder="Enter status...">${p.bio || ''}</textarea>
                                        </div>`
                : p.bio ? `<div class="pt-2 text-gray-400 italic text-xs text-center">"${p.bio}"</div>` : ''
            }

                                <div class="flex justify-between pt-2">
                                    <span class="text-yellow-400">Level ${p.campaignLevel || 1}</span>
                                </div>
                                
                                <!-- Actions -->
                                <div class="pt-4 flex gap-3">
                                    ${this.isEditing
                ? `
                                        <button id="cancel-edit-btn" class="flex-1 py-2 border border-gray-600 text-gray-400 hover:text-white hover:border-white text-xs font-bold">CANCEL</button>
                                        <button id="save-edit-btn" class="flex-1 py-2 bg-accent text-black font-bold text-xs hover:bg-white transition-colors">SAVE CHANGES</button>
                                        `
                : `
                                        <button id="edit-profile-btn" class="w-full py-3 bg-accent/10 border border-accent text-accent hover:bg-accent hover:text-black font-bold text-sm tracking-widest transition-all">
                                             <i class="fas fa-cog mr-2"></i>EDIT PROFILE
                                        </button>
                                        <button id="logout-btn" class="w-full mt-2 py-3 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white font-bold text-sm tracking-widest transition-all">
                                             <i class="fas fa-sign-out-alt mr-2"></i>LOGOUT
                                        </button>
                                        `
            }
                                </div>
                            </div>
                        </div>
                    </div>

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

    private renderGameRow(g: RecentGame): string {
        const date = new Date(g.date).toLocaleDateString();
        const colorClass = g.result === 'win' ? 'text-green-400' : (g.result === 'draw' ? 'text-gray-400' : 'text-red-400');
        const bgHover = g.result === 'win' ? 'hover:bg-green-900/10' : 'hover:bg-red-900/10';

        // Add onclick handler to navigate to detailed view (Step 2)
        // For now, we'll just add the clickable class and ID
        return `
            <div 
                class="p-3 flex items-center justify-between ${bgHover} transition-colors cursor-pointer group"
                onclick="window.history.pushState({}, '', '/match-details?id=${g.id}'); window.dispatchEvent(new Event('popstate'));"
            >
                <div class="flex flex-col">
                    <span class="text-sm font-bold ${colorClass}">${g.result.toUpperCase()}</span>
                    <span class="text-[10px] text-gray-500">${g.gameMode.toUpperCase()} • ${date}</span>
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
        this.container = document.getElementById('app') || document.body;
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

        // Edit Profile Toggle
        this.$('#edit-profile-btn')?.addEventListener('click', () => {
            this.isEditing = true;
            this.refresh();
        });

        this.$('#logout-btn')?.addEventListener('click', () => {
            const currentUser = AuthService.getInstance().getCurrentUser();
            const isMainUser = currentUser && this.profile && currentUser.userId === this.profile.userId;

            if (isMainUser) {
                if (confirm('Are you sure you want to logout globally?')) {
                    AuthService.getInstance().logout();
                }
            } else {
                // Check if it's a local player
                const localService = LocalPlayerService.getInstance();
                const localPlayer = localService.getLocalPlayers().find(p => p.userId === this.profile?.userId);

                if (localPlayer) {
                    if (confirm(`Remove ${localPlayer.username} from the session?`)) {
                        localService.removeLocalPlayer(localPlayer.id);
                        App.getInstance().router.navigateTo('/main-menu');
                    }
                } else {
                    // Fallback for viewing other profiles (shouldn't really happen if logic is correct, or maybe admin view)
                    if (confirm('Are you sure you want to logout globally?')) {
                        AuthService.getInstance().logout();
                    }
                }
            }
        });

        // Cancel Edit
        this.$('#cancel-edit-btn')?.addEventListener('click', () => {
            this.isEditing = false;
            this.refresh();
        });

        // Save Edit
        this.$('#save-edit-btn')?.addEventListener('click', () => {
            this.initiateSave();
        });
    }

    private initiateSave(): void {
        const modal = new PasswordConfirmationModal(
            (password) => this.saveChanges(password),
            () => { } // On cancel do nothing
        );
        modal.render();
    }

    private async saveChanges(password: string): Promise<void> {
        if (!this.profile) return;

        // Harvest Data
        const avatar = (this.$('#edit-avatar') as HTMLInputElement).value;
        const country = (this.$('#edit-country') as HTMLInputElement).value;
        const bio = (this.$('#edit-bio') as HTMLTextAreaElement).value;

        // Visual Feedback
        const btn = this.$('#save-edit-btn') as HTMLButtonElement;
        if (btn) {
            btn.innerText = "SAVING...";
            btn.disabled = true;
        }

        try {
            if (!this.profile) throw new Error("Profile not loaded");

            // 1. Verify Password using the TARGET PROFILE'S username
            // Use verifyCredentials to avoid changing the global authenticated session
            const authRes = await AuthService.getInstance().verifyCredentials(this.profile.username, password);
            if (!authRes.success) throw new Error("Invalid password");

            // 2. Perform Update
            const payload = {
                avatarUrl: avatar,
                country: country,
                bio: bio
            };

            const res = await Api.put(`/api/user/profile/${this.profile.userId}`, payload);
            if (res.error) throw new Error(res.error);

            // 3. Sync with LocalPlayerService to reflect changes immediately in Main Menu
            LocalPlayerService.getInstance().updateLocalPlayer(this.profile.userId, {
                avatarUrl: avatar,
                // potentially update other fields if LocalPlayer supported them
            });

            // Success
            this.isEditing = false;
            // Reload to be sure
            await this.loadProfile(this.profile.userId);

        } catch (e: any) {
            alert(e.message || "Failed to update profile"); // Simple feedback for now
            if (btn) {
                btn.innerText = "SAVE CHANGES";
                btn.disabled = false;
            }
        }
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
