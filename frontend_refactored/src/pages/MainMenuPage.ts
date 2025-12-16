import { AbstractComponent } from "../components/AbstractComponent";
import { AuthService } from "../services/AuthService";
import { App } from "../core/App";
import { TournamentAliasModal } from "../components/TournamentAliasModal";
import { LoginModal } from "../components/LoginModal";
import { GameStateService } from "../services/GameStateService";

interface Player {
    id: number;
    username: string;
    isBot?: boolean;
    alias?: string;
}

type GameMode = 'campaign' | 'arcade' | 'tournament';

interface GameSettings {
    ballSpeed: 'slow' | 'medium' | 'fast';
    paddleSpeed: 'slow' | 'medium' | 'fast';
    powerups: boolean;
    accumulateOnHit: boolean;
}

export class MainMenuPage extends AbstractComponent {
    private activeMode: GameMode = 'campaign';
    private availablePlayers: Player[] = [];

    // Settings State
    private settings: GameSettings = {
        ballSpeed: 'medium',
        paddleSpeed: 'medium',
        powerups: false,
        accumulateOnHit: false
    };

    // Mode Specific State
    private campaignPlayer: Player | null = null;
    private arcadeTeam1: Player[] = [];
    private arcadeTeam2: Player[] = [];
    private tournamentPlayers: Player[] = [];

    private static readonly STORAGE_KEY = 'mainMenuState';

    constructor() {
        super();
        this.setTitle('Main Menu');

        // Load persisted state first
        this.loadState();

        // If no available players, add current user
        const currentUser = AuthService.getInstance().getCurrentUser();
        if (currentUser && !this.availablePlayers.some(p => p.id === currentUser.userId)) {
            this.availablePlayers.push({
                id: currentUser.userId,
                username: currentUser.username
            });
            // Default: Assign current user to campaign slot if empty
            if (!this.campaignPlayer) {
                this.campaignPlayer = { id: currentUser.userId, username: currentUser.username };
            }
        }
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
            <div class="w-full h-full bg-black p-6 flex gap-6 font-vcr text-white overflow-hidden relative select-none">
                
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
                    <div class="bg-accent text-black p-3 font-bold text-lg mb-2">
                        AVAILABLE <span class="text-sm opacity-80 ml-2">(${this.availablePlayers.length})</span>
                    </div>

                    <div class="flex-1 p-4 overflow-y-auto">
                        <div class="grid gap-3" id="available-list">
                            ${this.renderAvailablePlayers()}
                        </div>
                    </div>
                    
                    <!-- Add Player Button (Replaces Input) -->
                    <div class="p-4 border-t border-accent bg-black">
                         <button id="add-player-btn" class="w-full py-3 bg-gray-900 border border-white/30 text-white font-vcr hover:bg-accent hover:text-black hover:border-accent transition-all flex items-center justify-center gap-2">
                            <i class="fas fa-plus"></i> ADD PLAYER
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
            case 'campaign': return "Embark on a solo journey against alien AI. Defeat 3 increasingly difficult opponents to ascend.";
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
                <div class="flex flex-col items-center justify-center h-full gap-8">
                    <div class="text-center w-full">
                        <div class="text-accent text-sm mb-2">PILOT</div>
                        ${this.campaignPlayer
                    ? this.renderPlayerCard(this.campaignPlayer, 'campaign')
                    : '<div class="border-2 border-dashed border-gray-700 p-8 text-gray-500">No Pilot Assigned</div>'}
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
                    <div class="flex-1 border border-blue-500/30 p-2 relative group" id="team-1-zone">
                        <div class="absolute top-0 right-0 p-1 text-xs text-blue-500">TEAM 1</div>
                        <div class="space-y-2 mt-4">
                            ${this.arcadeTeam1.map(p => this.renderPlayerCard(p, 'arcade', 1)).join('')}
                            ${this.arcadeTeam1.length < 2 ? '<div class="text-center text-gray-600 text-xs py-4">Add Player</div>' : ''}
                        </div>
                    </div>
                    <div class="flex-1 border border-pink-500/30 p-2 relative group" id="team-2-zone">
                        <div class="absolute top-0 right-0 p-1 text-xs text-pink-500">TEAM 2</div>
                         <div class="space-y-2 mt-4">
                            ${this.arcadeTeam2.map(p => this.renderPlayerCard(p, 'arcade', 2)).join('')}
                             ${this.arcadeTeam2.length < 2 ? '<div class="text-center text-gray-600 text-xs py-4">Add Player</div>' : ''}
                        </div>
                    </div>
                </div>
            `;
        }

        if (this.activeMode === 'tournament') {
            return `
                <div class="space-y-3">
                    ${this.tournamentPlayers.map(p => this.renderPlayerCard(p, 'tournament')).join('')}
                    ${this.tournamentPlayers.length < 8 ? '<div class="text-center text-gray-700 py-8">Add players from Available List</div>' : ''}
                </div>
            `;
        }
        return '';
    }

    private renderPlayerCard(p: Player, context: string, team?: number): string {
        return `
            <div class="border border-white bg-black p-3 flex items-center justify-between group hover:border-accent transition-all">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-gray-800 bg-cover bg-center" style="background-image: url('https://ui-avatars.com/api/?name=${p.username}&background=random')"></div>
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
            <div class="border border-white/20 p-3 flex items-center justify-between hover:bg-white/5 transition-all group ${isAssigned ? 'opacity-50' : ''}">
                <div class="flex items-center gap-3">
                    <i class="far fa-user text-gray-500"></i>
                    <span class="text-lg text-gray-300 group-hover:text-white">${p.username}</span>
                </div>
                ${!isAssigned ? `
                <div class="relative">
                    <button class="context-menu-btn text-accent hover:text-white p-2" data-id="${p.id}">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div id="context-menu-${p.id}" class="context-menu hidden absolute right-0 top-full bg-black border border-accent z-50 w-48 shadow-[0_0_15px_rgba(41,182,246,0.5)]">
                        <button class="w-full text-left px-4 py-2 hover:bg-accent hover:text-black text-xs font-bold context-action" data-action="profile" data-id="${p.id}">VIEW PROFILE</button>
                        ${this.getAssignmentOptions(p.id)}
                    </div>
                </div>
                ` : '<span class="text-xs text-accent">ASSIGNED</span>'}
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

    private getAssignmentOptions(playerId: number): string {
        let options = '';
        if (this.activeMode === 'campaign') {
            options += `<button class="w-full text-left px-4 py-2 hover:bg-accent hover:text-black text-xs font-bold context-action" data-action="assign" data-target="campaign" data-id="${playerId}">ASSIGN AS PILOT</button>`;
        } else if (this.activeMode === 'tournament') {
            options += `<button class="w-full text-left px-4 py-2 hover:bg-accent hover:text-black text-xs font-bold context-action" data-action="assign" data-target="tournament" data-id="${playerId}">ADD TO TOURNAMENT</button>`;
        } else if (this.activeMode === 'arcade') {
            options += `<button class="w-full text-left px-4 py-2 hover:bg-accent hover:text-black text-xs font-bold context-action" data-action="assign" data-target="team1" data-id="${playerId}">ADD TO TEAM 1</button>`;
            options += `<button class="w-full text-left px-4 py-2 hover:bg-accent hover:text-black text-xs font-bold context-action" data-action="assign" data-target="team2" data-id="${playerId}">ADD TO TEAM 2</button>`;
        }
        return options;
    }

    onMounted(): void {
        // CRITICAL: Set container to the root element that contains our rendered HTML
        this.container = document.getElementById('app') || document.body;
        this.bindEvents();
    }

    private bindEvents(): void {
        if (!this.container) return;

        // Mode Switching Delegate
        this.container.onclick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

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

            // Context Menu Toggle in Available Players
            const menuBtn = target.closest('.context-menu-btn') as HTMLElement;
            if (menuBtn) {
                const id = menuBtn.dataset.id;
                const menu = document.getElementById(`context-menu-${id}`);

                // Close all other menus
                document.querySelectorAll('.context-menu').forEach(m => {
                    if (m.id !== `context-menu-${id}`) m.classList.add('hidden');
                });

                if (menu) menu.classList.toggle('hidden');
                e.stopPropagation(); // Prevent closing immediately
                return;
            }

            // Context Menu Action
            const actionBtn = target.closest('.context-action') as HTMLElement;
            if (actionBtn) {
                const action = actionBtn.dataset.action;
                const id = parseInt(actionBtn.dataset.id!);

                if (action === 'profile') {
                    App.getInstance().router.navigateTo(`/profile?id=${id}`);
                } else if (action === 'assign') {
                    const targetType = actionBtn.dataset.target!;
                    this.assignPlayer(id, targetType);
                }
                return;
            }

            // Close menus on click outside
            if (!target.closest('.context-menu') && !target.closest('.context-menu-btn')) {
                document.querySelectorAll('.context-menu').forEach(m => m.classList.add('hidden'));
            }

            // Assign Buttons (Legacy or other places?)
            const assignBtn = target.closest('.assign-btn') as HTMLElement;
            if (assignBtn) {
                const id = parseInt(assignBtn.dataset.id!);
                const targetType = assignBtn.dataset.target!;
                this.assignPlayer(id, targetType);
                return;
            }

            // Remove Buttons
            const removeBtn = target.closest('.remove-from-party-btn') as HTMLElement;
            if (removeBtn) {
                const id = parseInt(removeBtn.dataset.id!);
                const context = removeBtn.dataset.context!;
                const team = removeBtn.dataset.team ? parseInt(removeBtn.dataset.team) : undefined;
                this.unassignPlayer(id, context, team);
                return;
            }

            // Add Player Button
            const addPlayerBtn = target.closest('#add-player-btn');
            if (addPlayerBtn) {
                const modal = new LoginModal(
                    (user) => {
                        // Check for duplicates
                        if (!this.availablePlayers.some(p => p.id === user.userId)) {
                            this.availablePlayers.push({ id: user.userId, username: user.username });
                            console.log("Player Added:", user.username);
                            this.renderContent();
                        } else {
                            alert("Player already in lobby!");
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
        };
    }

    private assignPlayer(id: number, target: string): void {
        const player = this.availablePlayers.find(p => p.id === id);
        if (!player) return;

        if (target === 'campaign') {
            this.campaignPlayer = player;
        } else if (target === 'tournament') {
            if (this.tournamentPlayers.length < 8 && !this.tournamentPlayers.find(p => p.id === player.id)) {
                this.tournamentPlayers.push(player);
            }
        } else if (target === 'team1') {
            if (this.arcadeTeam1.length < 2 && !this.arcadeTeam1.find(p => p.id === player.id)) {
                this.arcadeTeam1.push(player);
            }
        } else if (target === 'team2') {
            if (this.arcadeTeam2.length < 2 && !this.arcadeTeam2.find(p => p.id === player.id)) {
                this.arcadeTeam2.push(player);
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
            // Map single player to team logic
            // We use 'alias' or construct a User-like object
            setup.team1 = [{
                userId: this.campaignPlayer.id,
                username: this.campaignPlayer.username
            } as any];

            // AI Opponent
            setup.team2 = [{
                userId: 0,
                username: 'ALIEN HIVE'
            } as any];

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
                isBot: p.isBot
            })) as any;

            setup.team2 = this.arcadeTeam2.map(p => ({
                userId: p.id,
                username: p.username,
                isBot: p.isBot
            })) as any;

            GameStateService.getInstance().setSetup(setup as any);
            App.getInstance().router.navigateTo('/game');

        } else {
            // Tournament logic
            if (this.tournamentPlayers.length < 2) {
                alert("Need at least 2 players for tournament");
                return;
            }
            const modal = new TournamentAliasModal(
                this.tournamentPlayers,
                async (playersWithAliases) => {
                    try {
                        const { TournamentService } = await import('../services/TournamentService');
                        const playerIds = playersWithAliases.map(p => p.id);
                        // Use a generic name or prompt for one?
                        const name = "Tournament " + new Date().toLocaleTimeString();

                        await TournamentService.getInstance().create(name, playerIds);

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
