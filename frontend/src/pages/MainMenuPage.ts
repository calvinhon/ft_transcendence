import { AbstractComponent } from "../components/AbstractComponent";
import { AuthService } from "../services/AuthService";
import { App } from "../core/App";
import { TournamentAliasModal } from "../components/TournamentAliasModal";
import { LoginModal } from "../components/LoginModal";
import { GameStateService } from "../services/GameStateService";
import { CampaignService } from "../services/CampaignService";

interface Player {
    id: number;
    username: string;
    isBot?: boolean;
    alias?: string;
    avatarUrl?: string | null;
}

type GameMode = 'campaign' | 'arcade' | 'tournament';

interface GameSettings {
    ballSpeed: 'slow' | 'medium' | 'fast';
    paddleSpeed: 'slow' | 'medium' | 'fast';
    powerups: boolean;
    accumulateOnHit: boolean;
    scoreToWin: number;
}

export class MainMenuPage extends AbstractComponent {
    private activeMode: GameMode = 'campaign';
    private availablePlayers: Player[] = [];

    // Settings State
    private settings: GameSettings = {
        ballSpeed: 'medium',
        paddleSpeed: 'medium',
        powerups: false,
        accumulateOnHit: false,
        scoreToWin: 5
    };

    // Mode Specific State
    private campaignPlayer: Player | null = null;
    private arcadeTeam1: Player[] = [];
    private arcadeTeam2: Player[] = [];
    private tournamentPlayers: Player[] = [];

    private static readonly STORAGE_KEY = 'mainMenuState_v2'; // Changed key to version state

    constructor() {
        super();
        this.setTitle('Main Menu');

        // Initialize Host in LocalPlayerService with full profile (including avatar)
        const currentUser = AuthService.getInstance().getCurrentUser();
        if (currentUser) {
            import('../services/LocalPlayerService').then(({ LocalPlayerService }) => {
                // Set host immediately with what we have
                LocalPlayerService.getInstance().setHostUser(currentUser);

                // Then fetch full profile to get avatar
                import('../services/ProfileService').then(({ ProfileService }) => {
                    ProfileService.getInstance().getUserProfile(currentUser.userId).then(profile => {
                        if (profile) {
                            // Update hostUser with avatar
                            const updatedHost = {
                                ...currentUser,
                                avatarUrl: (profile as any).avatar_url || profile.avatarUrl
                            };
                            LocalPlayerService.getInstance().setHostUser(updatedHost as any);
                            this.updateAvailablePlayersList();
                        }
                    }).catch(err => console.warn('Failed to fetch host profile:', err));
                });
            });
        }

        this.loadState();

        // Subscribe to LocalPlayer changes
        import('../services/LocalPlayerService').then(({ LocalPlayerService }) => {
            LocalPlayerService.getInstance().subscribe(() => {
                this.updateAvailablePlayersList();
            });
            // Initial sync
            this.updateAvailablePlayersList();
        });
    }

    private updateAvailablePlayersList() {
        // Dynamic import to avoid issues, or use top level if safe.
        import('../services/LocalPlayerService').then(({ LocalPlayerService }) => {
            const all = LocalPlayerService.getInstance().getAllParticipants();
            this.availablePlayers = all.map(p => ({
                id: p.id,
                username: p.username,
                isBot: p.isBot,
                avatarUrl: p.avatarUrl // CRITICAL: Preserve avatarUrl
            }));

            // Reconcile teams (remove players who logged out)
            const availableIds = new Set(this.availablePlayers.map(p => p.id));
            if (this.campaignPlayer && !availableIds.has(this.campaignPlayer.id)) {
                this.campaignPlayer = null;
            }
            this.arcadeTeam1 = this.arcadeTeam1.filter(p => availableIds.has(p.id));
            this.arcadeTeam2 = this.arcadeTeam2.filter(p => availableIds.has(p.id));
            this.tournamentPlayers = this.tournamentPlayers.filter(p => availableIds.has(p.id));

            this.renderContent();
        });
    }

    private loadState(): void {
        try {
            const saved = sessionStorage.getItem(MainMenuPage.STORAGE_KEY);
            if (saved) {
                const state = JSON.parse(saved);
                this.activeMode = state.activeMode || 'campaign';
                this.availablePlayers = state.availablePlayers || [];
                this.settings = state.settings || this.settings;
                this.campaignPlayer = state.campaignPlayer || null;
                this.arcadeTeam1 = state.arcadeTeam1 || [];
                this.arcadeTeam2 = state.arcadeTeam2 || [];
                this.tournamentPlayers = state.tournamentPlayers || [];
            }
        } catch (e) {
            console.warn('Failed to load MainMenuPage state:', e);
        }
    }

    private saveState(): void {
        try {
            const state = {
                activeMode: this.activeMode,
                availablePlayers: this.availablePlayers,
                settings: this.settings,
                campaignPlayer: this.campaignPlayer,
                arcadeTeam1: this.arcadeTeam1,
                arcadeTeam2: this.arcadeTeam2,
                tournamentPlayers: this.tournamentPlayers
            };
            sessionStorage.setItem(MainMenuPage.STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('Failed to save MainMenuPage state:', e);
        }
    }


    getHtml(): string {
        return `
            <div id="main-menu-root" class="w-full h-full bg-black p-6 flex gap-6 font-vcr text-white overflow-hidden relative select-none">
                
                <!-- LEFT COLUMN: GAME MODES & SETTINGS -->
                <div class="w-1/4 flex flex-col gap-6">
                    <!-- Tabs -->
                    <div class="flex border border-accent">
                        <button class="mode-btn flex-1 py-3 text-xs font-bold transition-all ${this.activeMode === 'campaign' ? 'bg-accent text-black shadow-[0_0_15px_rgba(41,182,246,0.4)]' : 'text-accent hover:bg-accent/20'}" data-mode="campaign">CAMPAIGN</button>
                        <button class="mode-btn flex-1 py-3 text-xs font-bold transition-all ${this.activeMode === 'arcade' ? 'bg-accent text-black shadow-[0_0_15px_rgba(41,182,246,0.4)]' : 'text-accent hover:bg-accent/20'}" data-mode="arcade">ARCADE</button>
                        <button class="mode-btn flex-1 py-3 text-xs font-bold transition-all ${this.activeMode === 'tournament' ? 'bg-accent text-black shadow-[0_0_15px_rgba(41,182,246,0.4)]' : 'text-accent hover:bg-accent/20'}" data-mode="tournament">TOURNAMENT</button>
                    </div>

                    <!-- Description -->
                    <div class="border border-accent p-6 min-h-[12rem]">
                        <h2 class="text-2xl font-bold mb-4 tracking-widest text-accent">${this.activeMode.toUpperCase()}</h2>
                        <p class="text-sm leading-7 text-gray-300">
                            ${this.getModeDescription()}
                        </p>
                    </div>

                    <!-- Settings -->
                    <div class="flex-1 border border-accent p-6 flex flex-col gap-8">
                        <!-- Ball Speed -->
                        <div>
                            <div class="text-lg mb-3 text-accent/80">Ball Speed</div>
                            <div class="flex border border-accent">
                                ${this.renderSpeedButton('ballSpeed', 'slow', 'SLOW')}
                                ${this.renderSpeedButton('ballSpeed', 'medium', 'MEDIUM')}
                                ${this.renderSpeedButton('ballSpeed', 'fast', 'FAST')}
                            </div>
                        </div>

                        <!-- Paddle Speed -->
                        <div>
                            <div class="text-lg mb-3 text-accent/80">Paddle Speed</div>
                            <div class="flex border border-accent">
                                ${this.renderSpeedButton('paddleSpeed', 'slow', 'SLOW')}
                                ${this.renderSpeedButton('paddleSpeed', 'medium', 'MEDIUM')}
                                ${this.renderSpeedButton('paddleSpeed', 'fast', 'FAST')}
                            </div>
                        </div>

                        <!-- Toggles -->
                        <div class="space-y-4">
                            <label class="flex justify-between items-center cursor-pointer group">
                                <span class="text-lg group-hover:text-accent transition-colors">Powerups</span>
                                <div class="relative w-6 h-6 border border-accent flex items-center justify-center setting-toggle" data-setting="powerups">
                                    ${this.settings.powerups ? '<div class="w-4 h-4 bg-accent"></div>' : ''}
                                </div>
                            </label>
                            <label class="flex justify-between items-center cursor-pointer group">
                                <span class="text-lg group-hover:text-accent transition-colors">Accelerate on Hit</span>
                                <div class="relative w-6 h-6 border border-accent flex items-center justify-center setting-toggle" data-setting="accumulateOnHit">
                                    ${this.settings.accumulateOnHit ? '<div class="w-4 h-4 bg-accent"></div>' : ''}
                                </div>
                            </label>
                            
                            <!-- Score Limit -->
                            <div class="flex justify-between items-center">
                                <span class="text-lg text-gray-300">Score Limit</span>
                                <div class="flex items-center gap-3">
                                    <button class="w-8 h-8 border border-accent hover:bg-accent hover:text-black flex items-center justify-center font-bold text-xl score-btn" data-action="dec">-</button>
                                    <span class="text-xl font-bold w-6 text-center text-accent">${this.settings.scoreToWin || 5}</span>
                                    <button class="w-8 h-8 border border-accent hover:bg-accent hover:text-black flex items-center justify-center font-bold text-xl score-btn" data-action="inc">+</button>
                                </div>
                            </div>
                        </div>
                    </div>


                     <button id="play-btn" class="w-full py-5 bg-accent text-black font-bold text-2xl tracking-[0.2em] hover:bg-white hover:shadow-[0_0_15px_rgba(41,182,246,0.5)] transition-all">
                        PLAY
                    </button>
                </div>

                <!-- MIDDLE COLUMN: DYNAMIC PARTY PANE -->
                <div class="w-1/3 border-y-2 border-accent flex flex-col bg-black/50">
                    <div class="bg-accent text-black p-3 font-bold flex justify-between items-center text-lg">
                        <span>${this.getMiddlePaneTitle()}</span>
                    </div>
                    
                    <div class="flex-1 p-4 relative overflow-y-auto custom-scrollbar">
                        ${this.renderMiddlePaneContent()}
                    </div>
                </div>

                <!-- RIGHT COLUMN: AVAILABLE PLAYERS -->
                <div class="flex-1 border border-accent flex flex-col bg-black/50">
                    <div class="bg-accent text-black p-3 font-bold text-lg">
                        AVAILABLE <span class="text-sm opacity-80 ml-2">(${this.availablePlayers.length})</span>
                    </div>
                    <div class="bg-black/40 p-2 text-[10px] text-gray-400 text-center tracking-widest border-b border-white/5">
                        DRAG TO DEPLOY • CLICK FOR INTEL
                    </div>

                    <div class="flex-1 p-4 overflow-y-auto custom-scrollbar relative">
                        <div class="grid gap-4 grid-cols-2" id="available-list">
                            ${this.renderAvailablePlayers()}
                        </div>
                    </div>
                    
                    <div class="p-4 border-t border-accent/20 bg-black/40">
                         <button id="add-player-btn" class="w-full py-4 border-2 border-dashed border-white/20 text-gray-500 hover:border-accent hover:text-accent hover:bg-accent/5 transition-all flex items-center justify-center gap-2 font-bold text-xs tracking-widest group">
                              <div class="w-6 h-6 rounded-full border border-current flex items-center justify-center group-hover:scale-110 transition-transform">
                                 <i class="fas fa-plus text-[10px]"></i>
                              </div>
                              ADD PLAYERS
                         </button>
                    </div>
                </div>
            </div>
        `;
    }

    private renderSpeedButton(type: 'ballSpeed' | 'paddleSpeed', value: string, label: string): string {
        const isActive = this.settings[type] === value;
        const classes = isActive
            ? 'flex-1 py-2 text-xs bg-accent text-black font-bold'
            : 'flex-1 py-2 text-xs hover:bg-accent hover:text-black transition-colors text-gray-500';
        return `<button class="setting-btn ${classes}" data-type="${type}" data-value="${value}">${label}</button>`;
    }

    private getModeDescription(): string {
        switch (this.activeMode) {
            case 'campaign':
                const level = CampaignService.getInstance().getCurrentLevel();
                const max = CampaignService.getInstance().getMaxLevel();
                return `Embark on a solo journey against alien AI. Current Level: <span class="text-accent font-bold">${level}/${max}</span>. Defeat increasingly difficult opponents to ascend.`;
            case 'arcade': return "Classic 2v2 or 1v1 action. Assign players to teams and battle it out locally.";
            case 'tournament': return "Gather up to 8 players for a bracket-style elimination tournament. Only one can be the champion.";
        }
    }

    private getMiddlePaneTitle(): string {
        switch (this.activeMode) {
            case 'campaign': return "MISSION CONTROL";
            case 'arcade': return "TEAM SELECTION";
            case 'tournament': return `BRACKET CANDIDATES (${this.tournamentPlayers.length}/8)`;
        }
    }

    private renderMiddlePaneContent(): string {
        if (this.activeMode === 'campaign') {
            return `
                <div id="campaign-zone" class="flex flex-col items-center justify-center h-full gap-8 border-2 border-transparent transition-all p-4">
                    <div class="text-center w-full">
                        <div class="text-accent text-sm mb-2">PILOT</div>
                        ${this.campaignPlayer
                    ? this.renderPlayerCard(this.campaignPlayer, 'campaign')
                    : '<div class="border-2 border-dashed border-gray-700 p-8 text-gray-500 bg-black/50 pointer-events-none">DRAG PILOT HERE</div>'}
                    </div>
                    <div class="text-2xl text-accent font-bold">VS</div>
                    <div class="text-center w-full opacity-50">
                        <div class="text-red-500 text-sm mb-2">ENEMY</div>
                        <div class="border border-red-900 bg-red-900/10 p-4 mx-auto w-full max-w-[200px]">
                            <i class="fas fa-robot text-4xl mb-2 text-red-500"></i>
                            <div class="text-red-500">ALIEN HIVE</div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (this.activeMode === 'arcade') {
            return `
                <div class="h-full flex flex-col gap-4">
                    <div class="flex-1 border-2 border-blue-500/30 p-2 relative group transition-all" id="team-1-zone">
                        <div class="absolute top-0 right-0 p-1 text-xs text-blue-500">TEAM 1</div>
                        <div class="space-y-2 mt-4">
                            ${this.arcadeTeam1.map(p => this.renderPlayerCard(p, 'arcade', 1)).join('')}
                            ${this.arcadeTeam1.length < 2 ? '<div class="text-center text-gray-600 text-xs py-4">DRAG PLAYER HERE</div>' : ''}
                        </div>
                    </div>
                    <div class="flex-1 border-2 border-pink-500/30 p-2 relative group transition-all" id="team-2-zone">
                        <div class="absolute top-0 right-0 p-1 text-xs text-pink-500">TEAM 2</div>
                         <div class="space-y-2 mt-4">
                            ${this.arcadeTeam2.map(p => this.renderPlayerCard(p, 'arcade', 2)).join('')}
                             ${this.arcadeTeam2.length < 2 ? '<div class="text-center text-gray-600 text-xs py-4">DRAG PLAYER HERE</div>' : ''}
                        </div>
                    </div>
                </div>
            `;
        }

        if (this.activeMode === 'tournament') {
            return `
                <div id="tournament-zone" class="h-full space-y-3 border-2 border-transparent transition-all p-2">
                    <div class="space-y-3">
                        ${this.tournamentPlayers.map(p => this.renderPlayerCard(p, 'tournament')).join('')}
                        ${this.tournamentPlayers.length < 8 ? '<div class="text-center text-gray-700 py-8 border-2 border-dashed border-gray-800">DRAG PLAYERS HERE</div>' : ''}
                    </div>
                </div>
            `;
        }
        return '';
    }

    private renderPlayerCard(p: Player, context: string, team?: number): string {
        const avatarStyle = p.avatarUrl
            ? `background-image: url('${p.avatarUrl}')`
            : `background-image: url('https://ui-avatars.com/api/?name=${encodeURIComponent(p.username)}&background=0A0A0A&color=29B6F6')`;

        return `
            <div class="party-player-card border border-white bg-black p-3 flex items-center justify-between group hover:border-accent transition-all cursor-pointer" data-id="${p.id}">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-gray-800 bg-cover bg-center" style="${avatarStyle}"></div>
                    <span class="text-lg">${p.username}</span>
                </div>
                <button class="remove-from-party-btn text-gray-600 hover:text-red-500" data-id="${p.id}" data-context="${context}" data-team="${team || ''}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }

    private renderAvailablePlayers(): string {
        return this.availablePlayers.map(p => {
            const isAssigned = this.isPlayerAssigned(p.id);
            return `
            <div class="available-player-card relative h-32 border border-white/10 bg-black/40 p-3 flex flex-col items-center justify-center gap-2 hover:bg-white/5 hover:border-accent transition-all cursor-pointer group ${isAssigned ? 'opacity-40 grayscale' : ''}" 
                 draggable="${!isAssigned}" 
                 data-id="${p.id}">
                
                <div class="w-12 h-12 rounded-full border border-white/10 overflow-hidden relative group-hover:border-accent group-hover:shadow-[0_0_10px_rgba(41,182,246,0.3)] transition-all bg-gray-900 flex items-center justify-center">
                    ${(p as any).avatarUrl
                    ? `<img src="${(p as any).avatarUrl}" class="w-full h-full object-cover">`
                    : `<img src="https://ui-avatars.com/api/?name=${p.username}&background=0A0A0A&color=29B6F6&font-size=0.5" class="w-full h-full object-cover">`
                }
                </div>
                
                <div class="text-xs font-bold text-gray-400 group-hover:text-white truncate w-full text-center tracking-wider font-vcr">
                    ${p.username}
                </div>

                ${isAssigned ? '<div class="absolute top-2 right-2 text-accent text-[10px]"><i class="fas fa-check"></i></div>' : ''}
            </div>
        `;
        }).join('');
    }

    private isPlayerAssigned(id: number): boolean {
        if (this.activeMode === 'campaign') return this.campaignPlayer?.id === id;
        if (this.activeMode === 'arcade') return this.arcadeTeam1.some(p => p.id === id) || this.arcadeTeam2.some(p => p.id === id);
        if (this.activeMode === 'tournament') return this.tournamentPlayers.some(p => p.id === id);
        return false;
    }

    public onMounted(): void {
        // Set container to the app element for renderContent compatibility
        this.container = document.getElementById('app') || undefined;
        // Bind events on the component root
        this.bindEvents();
    }

    onDestroy(): void {
        this.container = undefined;
    }

    private bindEvents(): void {
        const root = document.getElementById('main-menu-root');
        if (!root) {
            console.error('❌ [MainMenu] CRITICAL: #main-menu-root NOT FOUND! Events will not work.');
            return;
        }

        // Robust Element Getter handling TextNodes and SVGs
        const getEl = (e: Event): HTMLElement => {
            const t = e.target as HTMLElement;
            return (t.nodeType === 3 ? t.parentElement! : t);
        };

        // --- Drag & Drop Delegation ---

        root.ondragstart = (e: DragEvent) => {
            const el = getEl(e);
            const target = el.closest('.available-player-card') as HTMLElement;
            if (target && target.dataset.id) {
                e.dataTransfer!.setData('userId', target.dataset.id);
                e.dataTransfer!.effectAllowed = 'copy';
                target.classList.add('opacity-50');
            }
        };

        root.ondragend = (e: DragEvent) => {
            const el = getEl(e);
            const target = el.closest('.available-player-card') as HTMLElement;
            if (target) {
                target.classList.remove('opacity-50');
            }
            root.querySelectorAll('.drag-over-active').forEach(el => {
                el.classList.remove('border-accent', 'bg-accent/10', 'drag-over-active');
                el.classList.add('border-transparent');
            });
        };

        root.ondragover = (e: DragEvent) => {
            e.preventDefault();
            const el = getEl(e);
            const zone = el.closest('[id$="-zone"]') as HTMLElement;
            if (zone) {
                zone.classList.add('border-accent', 'bg-accent/10', 'drag-over-active');
                e.dataTransfer!.dropEffect = 'copy';
            }
        };

        root.ondragleave = (e: DragEvent) => {
            const el = getEl(e);
            const zone = el.closest('[id$="-zone"]') as HTMLElement;
            if (zone) {
                zone.classList.remove('border-accent', 'bg-accent/10', 'drag-over-active');
            }
        };

        root.ondrop = (e: DragEvent) => {
            e.preventDefault();
            const el = getEl(e);
            const zone = el.closest('[id$="-zone"]') as HTMLElement;
            if (zone) {
                zone.classList.remove('border-accent', 'bg-accent/10', 'drag-over-active');
                const userId = parseInt(e.dataTransfer!.getData('userId'));
                if (!userId) return;

                let targetType = '';
                if (zone.id === 'campaign-zone') targetType = 'campaign';
                if (zone.id === 'tournament-zone') targetType = 'tournament';
                if (zone.id === 'team-1-zone') targetType = 'team1';
                if (zone.id === 'team-2-zone') targetType = 'team2';

                if (targetType) {
                    this.assignPlayer(userId, targetType);
                }
            }
        };


        // --- Click Delegation ---

        root.onclick = (e: MouseEvent) => {
            const target = getEl(e);

            // Remove Buttons (Unassign) - Check FIRST to prevent card click bubbling
            const removeBtn = target.closest('.remove-from-party-btn') as HTMLElement;
            if (removeBtn) {
                const id = parseInt(removeBtn.dataset.id!);
                const context = removeBtn.dataset.context!;
                const team = removeBtn.dataset.team ? parseInt(removeBtn.dataset.team) : undefined;
                this.unassignPlayer(id, context, team);
                e.stopPropagation();
                return;
            }

            // Player Card Click -> Profile (Available OR Party)
            const playerCard = target.closest('.available-player-card, .party-player-card') as HTMLElement;
            if (playerCard) {
                const id = parseInt(playerCard.dataset.id!);
                if (!isNaN(id)) {
                    App.getInstance().router.navigateTo(`/profile?id=${id}`);
                    return;
                }
            }

            // Mode Tabs
            const modeBtn = target.closest('.mode-btn') as HTMLElement;
            if (modeBtn) {
                this.activeMode = modeBtn.dataset.mode as GameMode;
                this.renderContent();
                return;
            }

            // Speed/Setting Buttons
            const settingBtn = target.closest('.setting-btn') as HTMLElement;
            if (settingBtn) {
                const type = settingBtn.dataset.type as 'ballSpeed' | 'paddleSpeed';
                const value = settingBtn.dataset.value as 'slow' | 'medium' | 'fast';
                this.settings[type] = value;
                this.renderContent();
                return;
            }

            // Toggles
            const toggle = target.closest('.setting-toggle');
            if (toggle) {
                const setting = toggle.getAttribute('data-setting') as 'powerups' | 'accumulateOnHit';
                this.settings[setting] = !this.settings[setting];
                this.renderContent();
                return;
            }

            // Add Player Button
            const addPlayerBtn = target.closest('#add-player-btn');
            if (addPlayerBtn) {
                const modal = new LoginModal(
                    async (user) => {
                        const { LocalPlayerService } = await import('../services/LocalPlayerService');
                        const { ProfileService } = await import('../services/ProfileService');

                        // Fetch full profile to ensure we have the avatar
                        let avatarUrl: string | undefined = undefined;
                        try {
                            const profile = await ProfileService.getInstance().getUserProfile(user.userId);
                            if (profile && profile.avatarUrl) {
                                avatarUrl = profile.avatarUrl || undefined; // Coerce null to undefined
                            }
                        } catch (err) {
                            console.warn('Failed to fetch profile for avatar', err);
                        }

                        LocalPlayerService.getInstance().addLocalPlayer({
                            id: user.userId.toString(),
                            userId: user.userId,
                            username: user.username,
                            email: user.email,
                            isCurrentUser: false,
                            token: user.token || '',
                            avatarUrl: avatarUrl
                        });

                        // Force update in case they already existed (to refresh avatar)
                        if (avatarUrl) {
                            LocalPlayerService.getInstance().updateLocalPlayer(user.userId, { avatarUrl });
                        }
                    },
                    () => { }
                );
                modal.render();
                return;
            }

            // Play Button
            const playBtn = target.closest('#play-btn');
            if (playBtn) {
                this.handlePlay();
                return;
            }

            // Score Buttons
            const scoreBtn = target.closest('.score-btn') as HTMLElement;
            if (scoreBtn) {
                const action = scoreBtn.dataset.action;
                let current = this.settings.scoreToWin || 5;
                if (action === 'inc') current = Math.min(21, current + 1);
                if (action === 'dec') current = Math.max(1, current - 1);
                this.settings.scoreToWin = current;
                this.renderContent();
                return;
            }

            // Settings Button
            const settingsBtn = target.closest('#settings-btn');
            if (settingsBtn) {
                App.getInstance().router.navigateTo('/settings');
                return;
            }
        };
    }

    private assignPlayer(id: number, target: string): void {
        const player = this.availablePlayers.find(p => p.id === id);
        if (!player) return;

        // Check if player is already assigned to ANY team in arcade mode
        const isOnTeam1 = this.arcadeTeam1.some(p => p.id === player.id);
        const isOnTeam2 = this.arcadeTeam2.some(p => p.id === player.id);
        const isInTournament = this.tournamentPlayers.some(p => p.id === player.id);

        if (target === 'campaign') {
            this.campaignPlayer = player;
        } else if (target === 'tournament') {
            if (this.tournamentPlayers.length < 8 && !isInTournament) {
                this.tournamentPlayers.push(player);
            }
        } else if (target === 'team1') {
            // CRITICAL: Check BOTH teams to prevent duplicate
            if (this.arcadeTeam1.length < 2 && !isOnTeam1 && !isOnTeam2) {
                this.arcadeTeam1.push(player);
            } else if (isOnTeam2) {
                console.warn(`Player ${player.username} is already on Team 2`);
            }
        } else if (target === 'team2') {
            // CRITICAL: Check BOTH teams to prevent duplicate
            if (this.arcadeTeam2.length < 2 && !isOnTeam1 && !isOnTeam2) {
                this.arcadeTeam2.push(player);
            } else if (isOnTeam1) {
                console.warn(`Player ${player.username} is already on Team 1`);
            }
        }
        this.renderContent();
    }

    private unassignPlayer(id: number, context: string, team?: number): void {
        if (context === 'campaign') {
            if (this.campaignPlayer?.id === id) this.campaignPlayer = null;
        } else if (context === 'tournament') {
            this.tournamentPlayers = this.tournamentPlayers.filter(p => p.id !== id);
        } else if (context === 'arcade') {
            if (team === 1) this.arcadeTeam1 = this.arcadeTeam1.filter(p => p.id !== id);
            if (team === 2) this.arcadeTeam2 = this.arcadeTeam2.filter(p => p.id !== id);
        }
        this.renderContent();
    }

    private renderContent(): void {
        // Re-render the whole page state. 
        if (this.container) {
            this.container.innerHTML = this.getHtml();
            // Re-bind events because elements are new
            this.bindEvents();
            // Persist state for navigation
            this.saveState();
        }
    }

    private handlePlay(): void {
        const setup: any = {
            mode: this.activeMode,
            settings: {
                ballSpeed: this.settings.ballSpeed,
                paddleSpeed: this.settings.paddleSpeed,
                powerups: this.settings.powerups,
                accumulateOnHit: this.settings.accumulateOnHit,
                difficulty: 'medium', // TODO: Add difficulty selector if needed
                scoreToWin: 5
            },
            team1: [],
            team2: [],
            tournamentPlayers: []
        };

        if (this.activeMode === 'campaign') {
            if (!this.campaignPlayer) {
                alert("Assign a pilot first");
                return;
            }
            // Map single player to team logic with avatar
            setup.team1 = [{
                userId: this.campaignPlayer.id,
                username: this.campaignPlayer.username,
                avatarUrl: this.campaignPlayer.avatarUrl
            } as any];

            // AI Opponent
            setup.team2 = [{
                userId: 0,
                username: 'ALIEN HIVE'
            } as any];

            const level = CampaignService.getInstance().getCurrentLevel();
            setup.settings.difficulty = CampaignService.getInstance().getDifficultyForLevel(level);

            GameStateService.getInstance().setSetup(setup as any);
            App.getInstance().router.navigateTo('/game');

        } else if (this.activeMode === 'arcade') {
            // Validate Teams
            if (this.arcadeTeam1.length === 0 || this.arcadeTeam2.length === 0) {
                alert("Both teams must have at least one player!");
                return;
            }

            setup.team1 = this.arcadeTeam1.map(p => ({
                userId: p.id,
                username: p.username,
                isBot: p.isBot,
                avatarUrl: p.avatarUrl
            })) as any;

            setup.team2 = this.arcadeTeam2.map(p => ({
                userId: p.id,
                username: p.username,
                isBot: p.isBot,
                avatarUrl: p.avatarUrl
            })) as any;

            GameStateService.getInstance().setSetup(setup as any);
            App.getInstance().router.navigateTo('/game');

        } else {
            // Tournament logic
            if (![4, 8].includes(this.tournamentPlayers.length)) {
                alert("Need 4 or 8 players for tournament");
                return;
            }
            const modal = new TournamentAliasModal(
                this.tournamentPlayers,
                async (playersWithAliases) => {
                    try {
                        const { TournamentService } = await import('../services/TournamentService');
                        const mappedPlayers = playersWithAliases.map(p => ({
                            id: p.id,
                            alias: p.alias,
                            avatarUrl: p.avatarUrl // Pass avatarUrl to service
                        }));

                        const name = "Tournament " + new Date().toLocaleTimeString();

                        await TournamentService.getInstance().create(name, mappedPlayers);

                        App.getInstance().router.navigateTo('/tournament');
                    } catch (e) {
                        alert("Failed to create tournament: " + e);
                    }
                },
                () => { }
            );
            modal.render();
        }
    }
}
