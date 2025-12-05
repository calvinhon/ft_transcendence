import { AbstractComponent } from "../components/AbstractComponent";
import { App } from "../core/App";
import { Api } from "../core/Api";
import { User } from "../types";

interface UserStats {
    wins: number;
    losses: number;
    matchesPlayed: number;
    winRate: number;
}

interface UserProfile extends User {
    stats?: UserStats;
}

export class ProfilePage extends AbstractComponent {
    private profileUser: UserProfile | null = null;
    private loading: boolean = true;
    private error: string | null = null;

    getHtml(): string {
        return `
            <div class="w-full h-full bg-black flex flex-col items-center justify-center p-8 font-vcr text-white">
                <div class="w-full max-w-4xl border border-accent p-8 relative bg-black/80">
                    <button id="back-btn" class="absolute top-4 left-4 text-accent hover:text-white">
                        <i class="fas fa-arrow-left"></i> BACK
                    </button>

                    ${this.renderContent()}
                </div>
            </div>
        `;
    }

    private renderContent(): string {
        if (this.loading) {
            return `<div class="text-center animate-pulse">LOADING PROFILE...</div>`;
        }
        if (this.error || !this.profileUser) {
            return `<div class="text-center text-red-500">ERROR: ${this.error || 'User not found'}</div>`;
        }

        const u = this.profileUser;
        const stats = u.stats || { wins: 0, losses: 0, matchesPlayed: 0, winRate: 0 };

        return `
            <div class="flex flex-col items-center gap-6">
                <!-- Avatar -->
                <div class="w-32 h-32 border-2 border-accent rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                    ${u.avatarUrl ? `<img src="${u.avatarUrl}" class="w-full h-full object-cover">` : '<i class="fas fa-user text-4xl text-gray-500"></i>'}
                </div>

                <!-- Name -->
                <div class="text-center">
                    <h1 class="text-4xl font-bold uppercase tracking-widest text-shadow-neon">${u.username}</h1>
                    <p class="text-gray-400 text-sm mt-2">ID: ${u.userId}</p>
                </div>

                <!-- Stats Grid -->
                <div class="grid grid-cols-2 gap-4 w-full mt-8">
                    <div class="border border-accent/50 p-4 text-center hover:bg-accent/10 transition-colors">
                        <div class="text-2xl font-bold text-green-400">${stats.wins}</div>
                        <div class="text-xs text-gray-400 uppercase">Wins</div>
                    </div>
                    <div class="border border-accent/50 p-4 text-center hover:bg-accent/10 transition-colors">
                        <div class="text-2xl font-bold text-red-400">${stats.losses}</div>
                        <div class="text-xs text-gray-400 uppercase">Losses</div>
                    </div>
                    <div class="border border-accent/50 p-4 text-center hover:bg-accent/10 transition-colors">
                        <div class="text-2xl font-bold text-white">${stats.matchesPlayed}</div>
                        <div class="text-xs text-gray-400 uppercase">Matches</div>
                    </div>
                    <div class="border border-accent/50 p-4 text-center hover:bg-accent/10 transition-colors">
                        <div class="text-2xl font-bold text-yellow-400">${(stats.winRate * 100).toFixed(1)}%</div>
                        <div class="text-xs text-gray-400 uppercase">Win Rate</div>
                    </div>
                </div>
            </div>
        `;
    }

    async onMounted(): Promise<void> {
        const params = new URLSearchParams(window.location.search);
        const userId = params.get('id');

        this.$('#back-btn')?.addEventListener('click', () => {
            App.getInstance().router.navigateTo('/main-menu');
        });

        if (!userId) {
            this.error = "No User ID specified";
            this.loading = false;
            this.refresh();
            return;
        }

        try {
            // Fetch User Basic Info
            // Try different endpoints or Mock
            // Assuming /api/users/:id exists. If not, use App.currentUser if ID matches

            const currentUser = App.getInstance().currentUser;
            if (currentUser && currentUser.userId === parseInt(userId)) {
                this.profileUser = { ...currentUser }; // Clone
                // Default stats if missing
                if (!this.profileUser.stats) {
                    this.profileUser.stats = { wins: 0, losses: 0, matchesPlayed: 0, winRate: 0 };
                }
            } else {
                // Fetch from User Service
                try {
                    const res = await Api.get(`/api/user/profile/${userId}`);
                    if (res) {
                        this.profileUser = {
                            userId: res.user_id,
                            username: res.display_name || `User ${res.user_id}`,
                            avatarUrl: res.avatar_url,
                            stats: {
                                wins: res.wins || 0,
                                losses: res.losses || 0,
                                matchesPlayed: res.total_games || 0,
                                winRate: res.winRate || 0
                            }
                        } as any;
                    }
                } catch (apiErr) {
                    console.error("API Fetch Error:", apiErr);
                    // Fallback for demo if API fails (e.g. user not found in DB yet)
                    this.profileUser = {
                        userId: parseInt(userId),
                        username: `User ${userId} (Offline)`,
                        stats: { wins: 0, losses: 0, matchesPlayed: 0, winRate: 0 }
                    } as any;
                }
            }

            // Stats from Object (already set above for remote)
            // If local (currentUser), we might want to fetch stats too?
            // For now, keep mock/merged logic simple.

            // Mock Stats for Demo if zeros (Optional, user wanted real stats viewing)
            // But if DB has 0, we show 0.


        } catch (e) {
            console.error(e);
            this.error = "Failed to load profile";
        } finally {
            this.loading = false;
            this.refresh();
        }
    }

    private refresh(): void {
        const container = this.container;
        if (container) {
            container.innerHTML = this.getHtml();
            this.onMounted(); // Re-bind events (careful with recursion/loops, actually AbstractComponent onMounted doesn't Auto-Bind usually?)
            // AbstractComponent logic usually involves render -> onMounted.
            // If I re-render HTML, I lose event listeners.
            // So I must re-bind.
            this.$('#back-btn')?.addEventListener('click', () => {
                App.getInstance().router.navigateTo('/main-menu');
            });
        }
    }
}
