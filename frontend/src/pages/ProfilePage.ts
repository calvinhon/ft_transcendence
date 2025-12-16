import { AbstractComponent } from "../components/AbstractComponent";
import { App } from "../core/App";
import { AuthService } from "../services/AuthService";
import { ProfileService, UserProfile, GameStats, RecentGame, TournamentRanking } from "../services/ProfileService";

export class ProfilePage extends AbstractComponent {
    private profile: UserProfile | null = null;
    private stats: GameStats | null = null;
    private history: RecentGame[] = [];
    private rankings: TournamentRanking[] = [];

    private loading: boolean = true;
    private error: string | null = null;

    getHtml(): string {
        return `
            <div class="w-full h-full bg-black flex flex-col relative font-vcr text-white overflow-hidden">
                <!-- Header -->
                <div class="p-4 border-b border-accent flex items-center justify-between bg-black/80 z-10">
                    <button id="back-btn" class="text-accent hover:text-white flex items-center gap-2">
                        <i class="fas fa-chevron-left"></i> RETURN TO BASE
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
            <div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <!-- LEFT COL: IDENTITY -->
                <div class="lg:col-span-1 space-y-6">
                    <!-- Profile Card -->
                    <div class="border border-accent p-6 bg-black/50 relative overflow-hidden group">
                        <div class="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"></div>
                        
                        <div class="flex flex-col items-center text-center">
                            <div class="w-32 h-32 border-2 border-accent rounded-full mb-4 overflow-hidden relative shadow-[0_0_20px_rgba(41,182,246,0.5)]">
                                ${p.avatarUrl
                ? `<img src="${p.avatarUrl}" class="w-full h-full object-cover">`
                : `<div class="w-full h-full bg-gray-900 flex items-center justify-center text-4xl text-gray-600">${p.username.charAt(0).toUpperCase()}</div>`
            }
                            </div>
                            
                            <h2 class="text-3xl font-bold text-accent mb-1">${p.username}</h2>
                            <div class="text-xs text-gray-500 mb-4">ID: ${p.userId}</div>
                            
                            <div class="w-full h-px bg-accent/30 my-4"></div>
                            
                            <div class="w-full space-y-3 text-sm text-left">
                                <div class="flex justify-between">
                                    <span class="text-gray-500">MEMBER SINCE</span>
                                    <span>${new Date(p.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-500">COUNTRY</span>
                                    <span>${p.country || 'Unknown'}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-500">CAMPAIGN</span>
                                    <span class="text-yellow-400">Level ${p.campaignLevel || 1}</span>
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
                            <div class="text-3xl font-bold text-yellow-400">${(s.winRate * 100).toFixed(1)}%</div>
                            <div class="text-xs text-gray-400 uppercase">Win Rate</div>
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

        return `
            <div class="p-3 flex items-center justify-between ${bgHover} transition-colors">
                <div class="flex flex-col">
                    <span class="text-sm font-bold ${colorClass}">${g.result.toUpperCase()}</span>
                    <span class="text-[10px] text-gray-500">${g.gameMode.toUpperCase()} • ${date}</span>
                </div>
                <div class="flex items-center gap-4">
                    <span class="text-sm text-gray-300">vs ${g.opponent}</span>
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

        try {
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

            if (!this.profile) {
                this.error = "User profile not found";
            }

        } catch (e) {
            console.error("Profile load error", e);
            this.error = "Failed to load profile data";
        } finally {
            this.loading = false;
            this.refresh();
        }
    }

    private refresh(): void {
        const container = this.container;
        if (container) {
            container.innerHTML = this.getHtml();
            this.$('#back-btn')?.addEventListener('click', () => {
                App.getInstance().router.navigateTo('/main-menu');
            });
        }
    }
}
