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

    public async create(name: string, playerIds: number[]): Promise<Tournament> {
        const currentUser = App.getInstance().currentUser;
        if (!currentUser) throw new Error("User not logged in");

        // 1. Create Tournament
        const tournamentData = {
            name,
            createdBy: currentUser.userId,
            participants: playerIds
        };
        const createRes = await Api.post('/api/tournament/tournaments/create', tournamentData);
        if (!createRes.success) throw new Error(createRes.error || "Failed to create tournament");

        const tournamentId = createRes.data.id;

        // 2. Add Participants
        for (const uid of playerIds) {
            await Api.post(`/api/tournament/tournaments/${tournamentId}/join`, { userId: uid });
        }

        // 3. Start
        await Api.post(`/api/tournament/tournaments/${tournamentId}/start`, {});

        return this.get(tournamentId);
    }

    public async get(id: string): Promise<Tournament> {
        const response = await Api.get(`/api/tournament/tournaments/${id}`);
        // Legacy returns { tournament, participants, matches } nesting?
        // Let's assume the API response structure matches usage. 
        // We might need to map it to our interface if it differs.
        const t = response.tournament || response;

        // Map backend response to local interface if needed
        const tournament: Tournament = {
            id: t.id,
            name: t.name,
            status: t.status,
            currentRound: t.current_round || 1,
            winnerId: t.winner_id,
            players: response.participants ? response.participants.map((p: any) => ({
                id: p.user_id,
                username: p.username || `Player ${p.user_id}`, // Username might need fetching if not provided
                isBot: false // Legacy default?
            })) : [],
            matches: response.matches ? response.matches.map((m: any) => ({
                matchId: m.id,
                tournamentId: m.tournament_id,
                player1Id: m.player1_id,
                player1Name: m.player1_name || 'TBD', // This might need a map lookup
                player2Id: m.player2_id,
                player2Name: m.player2_name || 'TBD',
                winnerId: m.winner_id,
                score1: m.player1_score,
                score2: m.player2_score,
                round: m.round,
                status: m.status
            })) : []
        };

        this.currentTournament = tournament;
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
        // Refresh local state
        await this.get(tournamentId);
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
