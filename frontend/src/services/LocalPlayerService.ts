import { User } from '../types';
import { Api } from '../core/Api';

export interface LocalPlayer {
    id: string;
    username: string;
    userId: number;
    team?: number; // 1 or 2 (for Arcade)
    avatarUrl?: string;
    isBot?: boolean;
}

export class LocalPlayerService {
    private static instance: LocalPlayerService;
    private localPlayers: LocalPlayer[] = [];
    private hostUser: User | null = null;
    private listeners: ((players: LocalPlayer[]) => void)[] = [];

    private constructor() {
        // Local players are stored server-side (in the auth-service session).
        // Keep a client cache for rendering only.
        void this.refreshFromServer();
    }

    public async refreshFromServer(): Promise<void> {
        try {
            const res = await Api.get('/api/auth/local-players');
            const data = res?.data ?? res;
            const players = (data?.players ?? data?.data?.players ?? []) as LocalPlayer[];
            if (Array.isArray(players)) {
                this.localPlayers = players;
                this.notifyListeners();
            }
        } catch (e) {
            // If not logged in yet, this may 401; keep cache empty.
        }
    }

    public async addBot(userId: number, username: string, avatarUrl?: string): Promise<LocalPlayer | null> {
        const res = await Api.post('/api/auth/local-players/add-bot', { userId, username, avatarUrl });
        const data = res?.data ?? res;
        const player = (data?.player ?? data?.data?.player) as LocalPlayer | undefined;
        await this.refreshFromServer();
        return player ?? null;
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

    public updateLocalPlayer(userId: number, updates: Partial<LocalPlayer>): void {
        const player = this.localPlayers.find(p => p.userId === userId);
        if (player) {
            Object.assign(player, updates);
            this.notifyListeners();
            void Api.post('/api/auth/local-players/update', {
                userId,
                team: updates.team,
                avatarUrl: updates.avatarUrl
            }).catch(() => {});
        }
    }

    public removeLocalPlayer(playerId: string): void {
        const index = this.localPlayers.findIndex(p => p.id === playerId);
        if (index >= 0) {
            const removed = this.localPlayers.splice(index, 1)[0];
            this.notifyListeners();
            console.log('Local player removed:', removed);
            void fetch(`/api/auth/local-players/${encodeURIComponent(String(removed.userId))}`, {
                method: 'DELETE',
                credentials: 'include'
            }).catch(() => {});
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

    public clearAllPlayers(notify: boolean = true): void {
        this.localPlayers = [];
        if (notify) this.notifyListeners();
        // Don't call the API clear if we're logging out, as the session is being destroyed anyway
    }

    public subscribe(callback: (players: LocalPlayer[]) => void): void {
        this.listeners.push(callback);
        // Initial call
        callback(this.localPlayers);
    }

    private notifyListeners(): void {
        this.listeners.forEach(cb => cb(this.localPlayers));
    }
}
