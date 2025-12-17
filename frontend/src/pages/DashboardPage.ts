import { AbstractComponent } from "../components/AbstractComponent";
import { App } from "../core/App";
import { AuthService } from "../services/AuthService";

export class DashboardPage extends AbstractComponent {
    getHtml(): string {
        const user = App.getInstance().currentUser;

        return `
            <div class="h-full w-full flex items-center justify-center bg-bg-primary border-[4px] border-accent p-4 box-border">
                <div class="flex flex-col items-center justify-center w-full max-w-3xl">
                    <!-- Logo Area -->
                    <div class="text-center mb-16">
                        <p class="text-white text-sm font-pixel italic opacity-80 mb-2">
                        Spiritual Ascension
                        </p>
                        <h1 class="text-6xl md:text-8xl font-bold font-pixel text-white tracking-tighter">
                        LAUNCH<span class="text-accent italic">SEQ</span>
                        </h1>
                    </div>

                    <!-- Buttons -->
                    <div class="flex gap-6">
                        <!-- Play Button -->
                        <button
                        id="play-btn"
                        class="w-24 h-24 bg-accent hover:bg-white transition-colors flex items-center justify-center group shadow-glow cursor-pointer"
                        onclick="app.router.navigateTo('/game')"
                        >
                            <i class="fas fa-play text-3xl text-white group-hover:text-black"></i>
                        </button>

                        <!-- Settings Button -->
                        <button
                        id="settings-btn"
                        class="w-24 h-24 bg-black border-2 border-white hover:bg-white transition-colors flex items-center justify-center group cursor-pointer"
                        >
                            <i class="fas fa-cog text-3xl text-white group-hover:text-black"></i>
                        </button>

                        <!-- Profile Button -->
                        <button
                        id="profile-btn"
                        class="w-24 h-24 bg-black border-2 border-panel-border hover:border-accent transition-colors flex items-center justify-center group cursor-pointer"
                        >
                            <i class="fas fa-user text-3xl text-white group-hover:text-accent"></i>
                        </button>
                    </div>

                    <!-- Footer -->
                    <div class="fixed bottom-8 w-full px-8 flex justify-between text-xs font-pixel text-text-muted">
                        <span id="logout-btn" class="cursor-pointer hover:text-white">
                            TERMINATE SESSION [${user?.username || 'GHOST'}]
                        </span>
                        <span>v2.0 PRO MAX</span>
                    </div>
                </div>
            </div>
        `;
    }

    onMounted(): void {
        this.$('#logout-btn')?.addEventListener('click', () => {
            AuthService.getInstance().logout();
        });

        // Add minimal interactions for settings/profile placeholder
        this.$('#settings-btn')?.addEventListener('click', () => alert('SETTINGS MODULE [LOCKED]'));
        this.$('#profile-btn')?.addEventListener('click', () => alert('PROFILE MODULE [LOCKED]'));
    }
}
