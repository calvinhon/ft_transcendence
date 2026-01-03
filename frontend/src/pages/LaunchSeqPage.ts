import { AbstractComponent } from "../components/AbstractComponent";
import { App } from "../core/App";

export class LaunchSeqPage extends AbstractComponent {
    constructor() {
        super();
        this.setTitle('Initialization');
    }

    getHtml(): string {
        return `
            <div class="fixed inset-0 bg-black flex items-center justify-center z-50 overflow-hidden">
                <!-- Launch Sequence UI -->
                <div id="launch-ui" class="flex flex-col items-center justify-center w-full max-w-4xl opacity-0 animate-fade-in transition-opacity duration-1000">
                    <div class="text-center mb-16">
                        <p class="text-white text-sm font-pixel italic opacity-80 mb-2 tracking-widest animate-pulse">
                            SYSTEM INITIALIZATION
                        </p>
                        <h1 class="text-6xl md:text-9xl font-bold font-pixel text-white tracking-tighter mb-4 glitch-text">
                            LAUNCH<span class="text-accent italic">SEQ</span>
                        </h1>
                        <p class="text-accent font-vcr text-xl tracking-[0.5em]">READY FOR ASCENSION</p>
                    </div>

                    <button id="init-btn" class="group relative w-32 h-32 flex items-center justify-center bg-transparent border-4 border-accent hover:bg-accent hover:text-black transition-all duration-300 rounded-full shadow-[0_0_30px_rgba(41,182,246,0.2)] hover:shadow-[0_0_50px_rgba(41,182,246,0.6)] cursor-pointer overflow-hidden">
                        <div class="absolute inset-0 bg-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <i class="fas fa-power-off text-4xl text-accent group-hover:text-black relative z-10 transition-colors"></i>
                    </button>
                    
                    <div class="mt-12 font-vcr text-xs text-gray-500">
                        PRESS TO INITIATE SEQUENCE
                    </div>
                </div>
            </div>

            <style>
                .animate-fade-in {
                    opacity: 1 !important;
                }
            </style>
        `;
    }

    onMounted(): void {
        // Fade in UI
        setTimeout(() => {
            const ui = this.$('#launch-ui');
            if (ui) ui.classList.add('animate-fade-in');
        }, 100);

        this.$('#init-btn')?.addEventListener('click', () => {
            this.playCutscene();
        });
    }

    private playCutscene(): void {
        const ui = this.$('#launch-ui');

        if (ui) ui.style.display = 'none';

        // Verify "database" (mock check) - Set flag that we've seen the intro
        localStorage.setItem('ft_transcendence_initialized', 'true');

        // Pan to lore instead of placeholder
        import('../core/BabylonWrapper').then(({ BabylonWrapper }) => {
            BabylonWrapper.getInstance().panToLore();
        });

        // Navigate immediately so that when they pan back, they are at the menu
        App.getInstance().router.navigateTo('/main-menu');
    }
}
