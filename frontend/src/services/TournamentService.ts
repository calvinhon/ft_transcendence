import { Api } from '../core/Api';
import { App } from '../core/App';

export interface TournamentMatch {
    matchId: string;
    tournamentId: string;
    player1Id: number;
    player1Name: string;
    player2Id: number;
    player2Name: string;
    winnerId?: number;
    score1?: number;
    score2?: number;
    round: number;
    status: 'pending' | 'in_progress' | 'completed';
}

export interface Tournament {
    id: string;
    name: string;
    players: { id: number, username: string, isBot: boolean }[];
    status: 'pending' | 'active' | 'completed';
    currentRound: number;
    matches: TournamentMatch[];
    winnerId?: number;
}

export class TournamentService {
    private static instance: TournamentService;
    private currentTournament: Tournament | null = null;

    private constructor() { }

    public static getInstance(): TournamentService {
        if (!TournamentService.instance) {
            TournamentService.instance = new TournamentService();
        }
        return TournamentService.instance;
    }

    public async create(name: string, players: { id: number, alias?: string, avatarUrl?: string | null }[], settings?: any): Promise<Tournament> {
        const currentUser = App.getInstance().currentUser;
        if (!currentUser) throw new Error("User not logged in");

        // 1. Create Tournament
        const tournamentData = {
            name,
            createdBy: currentUser.userId,
            participants: players.map(p => p.id)
        };
        const createRes = await Api.post('/api/tournament/tournaments/create', tournamentData);
        if (!createRes.success) throw new Error(createRes.error || "Failed to create tournament");

        const tournamentId = createRes.data.id;

        // Save aliases locally since backend might not support them yet
        const aliasMap: Record<number, string> = {};
        const avatarMap: Record<number, string> = {};
        players.forEach(p => {
            if (p.alias) aliasMap[p.id] = p.alias;
            if (p.avatarUrl) avatarMap[p.id] = p.avatarUrl;
        });
        sessionStorage.setItem(`tournament_aliases_${tournamentId}`, JSON.stringify(aliasMap));
        sessionStorage.setItem(`tournament_avatars_${tournamentId}`, JSON.stringify(avatarMap));
        
        // Save tournament settings
        if (settings) {
            sessionStorage.setItem(`tournament_settings_${tournamentId}`, JSON.stringify(settings));
        }

        // 2. Add Participants
        for (const p of players) {
            await Api.post(`/api/tournament/tournaments/${tournamentId}/join`, { userId: p.id });
        }

        // 3. Start
        await Api.post(`/api/tournament/tournaments/${tournamentId}/start`, {});

        return this.get(tournamentId);
    }

    public async get(id: string): Promise<Tournament> {
        // Add cache buster to ensure fresh data
        const response = await Api.get(`/api/tournament/tournaments/${id}?t=${Date.now()}`);
        const t = response.tournament || response;

        // Load aliases
        let aliasMap: Record<number, string> = {};
        let avatarMap: Record<number, string> = {};
        try {
            const storedAliases = sessionStorage.getItem(`tournament_aliases_${t.id}`);
            if (storedAliases) aliasMap = JSON.parse(storedAliases);

            const storedAvatars = sessionStorage.getItem(`tournament_avatars_${t.id}`);
            if (storedAvatars) avatarMap = JSON.parse(storedAvatars);
        } catch (e) { }

        // Map backend response to local interface if needed
        const tournament: Tournament = {
            id: t.id,
            name: t.name,
            status: t.status,
            currentRound: t.current_round || 1,
            winnerId: t.winner_id,
            players: response.participants ? response.participants.map((p: any) => ({
                id: p.user_id,
                username: aliasMap[p.user_id] || p.username || `Player ${p.user_id}`,
                isBot: false,
                avatarUrl: avatarMap[p.user_id] || p.avatar_url || null
            })) : [],
            matches: response.matches ? response.matches.map((m: any) => ({
                matchId: m.id,
                tournamentId: m.tournament_id,
                player1Id: m.player1_id,
                player1Name: aliasMap[m.player1_id] || m.player1_name || 'TBD',
                player2Id: m.player2_id,
                player2Name: aliasMap[m.player2_id] || m.player2_name || 'TBD',
                winnerId: m.winner_id,
                score1: m.player1_score,
                score2: m.player2_score,
                round: m.round,
                status: m.status
            })) : []
        };

        this.currentTournament = tournament;
        if (tournament.status !== 'completed') {
            sessionStorage.setItem('current_tournament_id', tournament.id);
        } else {
            sessionStorage.removeItem('current_tournament_id');
        }
        return tournament;
    }

    public async recordMatchResult(
        tournamentId: string,
        matchId: string,
        winnerId: number,
        score1: number,
        score2: number
    ): Promise<void> {
        await Api.post(`/api/tournament/tournaments/${tournamentId}/matches/${matchId}/result`, {
            winnerId,
            player1Score: score1,
            player2Score: score2
        });

        // Wait a moment for backend to process next round creation (Legacy compatibility)
        await new Promise(resolve => setTimeout(resolve, 800));

        // Refresh local state
        await this.get(tournamentId);
    }

    public getTournamentSettings(tournamentId: string): any {
        try {
            const settings = sessionStorage.getItem(`tournament_settings_${tournamentId}`);
            return settings ? JSON.parse(settings) : null;
        } catch (e) {
            console.error('Failed to load tournament settings', e);
            return null;
        }
    }

    public async recordOnBlockchain(tournamentId: string, winnerId: number): Promise<any> {
        return Api.post('/api/tournament/blockchain/record', {
            tournamentId,
            winnerId
        });
    }

    public async list(): Promise<Tournament[]> {
        return Api.get('/api/tournament/tournaments/list');
    }

    public getCurrentTournament(): Tournament | null {
        return this.currentTournament;
    }
}
