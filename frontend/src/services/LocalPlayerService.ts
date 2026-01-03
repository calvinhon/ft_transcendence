import { User } from '../types';

export interface LocalPlayer {
    id: string;
    username: string;
    isCurrentUser: boolean;
    userId: number;
    token: string;
    team?: number; // 1 or 2 (for Arcade)
    email?: string;
    avatarUrl?: string;
    isBot?: boolean;
}

export class LocalPlayerService {
    private static instance: LocalPlayerService;
    private localPlayers: LocalPlayer[] = [];
    private hostUser: User | null = null;
    private listeners: ((players: LocalPlayer[]) => void)[] = [];

    private constructor() {
        this.loadFromLocalStorage();
    }

    public static getInstance(): LocalPlayerService {
        if (!LocalPlayerService.instance) {
            LocalPlayerService.instance = new LocalPlayerService();
        }
        return LocalPlayerService.instance;
    }

    public setHostUser(user: User): void {
        this.hostUser = user;
    }

    public getHostUser(): User | null {
        return this.hostUser;
    }

    public isDuplicateLocalPlayer(user: User): { duplicate: boolean; reason?: string } {
        // Check against Host
        if (this.hostUser && (this.hostUser.userId === user.userId || this.hostUser.username === user.username)) {
            return { duplicate: true, reason: 'User is already the Host' };
        }

        // Check against existing local players
        const existing = this.localPlayers.find(p => p.userId === user.userId || p.username === user.username);
        if (existing) {
            return { duplicate: true, reason: `User ${user.username} is already added` };
        }

        return { duplicate: false };
    }

    public addLocalPlayer(player: LocalPlayer): void {
        // Set default avatar if missing
        if (!player.avatarUrl) {
            player.avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.username)}&background=0A0A0A&color=29B6F6`;
        }

        const check = this.isDuplicateLocalPlayer({
            ...player,
            userId: player.userId,
            avatarUrl: player.avatarUrl || undefined
        });

        // Note: isDuplicateLocalPlayer checks IDs. If we just created a stub player, it might pass.
        // But usually we pass a real User object.
        // We re-check username specifically for good measure
        const existing = this.localPlayers.find(p => p.username === player.username);

        if (check.duplicate || existing) {
            console.warn(`Player "${player.username}" already exists/duplicate:`, check.reason);
            return;
        }

        this.localPlayers.push(player);
        this.saveToLocalStorage();
        this.notifyListeners();
        console.log('Local player added:', player);
    }

    public updateLocalPlayer(userId: number, updates: Partial<LocalPlayer>): void {
        const player = this.localPlayers.find(p => p.userId === userId);
        if (player) {
            Object.assign(player, updates);
            this.saveToLocalStorage();
            this.notifyListeners();
        }
    }

    public assignPlayerToTeam(playerId: string, team: number): void {
        const player = this.localPlayers.find(p => p.id === playerId);
        if (player) {
            player.team = team;
            this.saveToLocalStorage();
            this.notifyListeners();
        }
    }

    public removeLocalPlayer(playerId: string): void {
        const index = this.localPlayers.findIndex(p => p.id === playerId);
        if (index >= 0) {
            const removed = this.localPlayers.splice(index, 1)[0];
            this.saveToLocalStorage();
            this.notifyListeners();
            console.log('Local player removed:', removed);
        }
    }

    public getLocalPlayers(): LocalPlayer[] {
        return [...this.localPlayers];
    }

    public getAllParticipants(): { id: number, username: string, isBot: boolean, avatarUrl?: string | null }[] {
        const participants: { id: number, username: string, isBot: boolean, avatarUrl?: string | null }[] = [];

        // Add Host
        if (this.hostUser) {
            participants.push({
                id: this.hostUser.userId,
                username: this.hostUser.username,
                isBot: false,
                avatarUrl: (this.hostUser as any).avatarUrl || (this.hostUser as any).avatar_url || null
            });
        }

        // Add Local Players
        this.localPlayers.forEach(p => {
            participants.push({
                id: p.userId,
                username: p.username,
                isBot: !!p.isBot,
                avatarUrl: p.avatarUrl
            });
        });

        return participants;
    }

    public clearAllPlayers(): void {
        this.localPlayers = [];
        this.saveToLocalStorage();
        this.notifyListeners();
    }

    public subscribe(callback: (players: LocalPlayer[]) => void): void {
        this.listeners.push(callback);
        // Initial call
        callback(this.localPlayers);
    }

    private loadFromLocalStorage(): void {
        try {
            const saved = localStorage.getItem('localPlayers');
            if (saved) {
                this.localPlayers = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('Failed to load local players:', error);
            this.localPlayers = [];
        }
    }

    private saveToLocalStorage(): void {
        try {
            localStorage.setItem('localPlayers', JSON.stringify(this.localPlayers));
        } catch (error) {
            console.warn('Failed to save local players:', error);
        }
    }

    private notifyListeners(): void {
        this.listeners.forEach(cb => cb(this.localPlayers));
    }
}
