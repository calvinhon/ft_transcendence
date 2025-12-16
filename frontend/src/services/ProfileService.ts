import { Api } from '../core/Api';

export interface UserProfile {
    id: number;
    userId: number;
    username: string;
    avatarUrl: string | null;
    bio: string | null;
    country: string | null;
    campaignLevel?: number;
    createdAt: string;
}

export interface GameStats {
    wins: number;
    losses: number;
    draws: number;
    totalGames: number;
    winRate: number;
    averageGameDuration: number;
}

export interface RecentGame {
    id: number;
    opponent: string;
    result: 'win' | 'loss' | 'draw';
    score: string;
    date: string;
    gameMode: string;
}

export interface TournamentRanking {
    tournamentName: string;
    date: string;
    rank: number | string;
    totalParticipants: number;
    status: string;
    isWinner: boolean;
}

export class ProfileService {
    private static instance: ProfileService;

    private constructor() { }

    public static getInstance(): ProfileService {
        if (!ProfileService.instance) {
            ProfileService.instance = new ProfileService();
        }
        return ProfileService.instance;
    }

    public async getUserProfile(userId: number): Promise<UserProfile | null> {
        try {
            const data = await Api.get(`/api/user/profile/${userId}`);
            if (!data) return null;

            return {
                id: data.id,
                userId: data.user_id,
                username: data.display_name || data.username, // Fallback
                avatarUrl: data.avatar_url,
                bio: data.bio,
                country: data.country,
                campaignLevel: data.campaign_level,
                createdAt: data.created_at
            };
        } catch (e) {
            console.error('Failed to load user profile', e);
            return null;
        }
    }

    public async getGameStats(userId: number): Promise<GameStats> {
        try {
            const res = await Api.get(`/api/game/stats/${userId}`);
            const data = res.data || res; // handle nesting

            return {
                wins: data.wins || 0,
                losses: data.losses || 0,
                draws: data.draws || 0,
                totalGames: data.totalGames || data.total_games || 0,
                winRate: data.winRate || 0,
                averageGameDuration: data.averageGameDuration || 0
            };
        } catch (e) {
            console.warn('Failed to load stats', e);
            return { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0, averageGameDuration: 0 };
        }
    }

    public async getRecentGames(userId: number): Promise<RecentGame[]> {
        try {
            const res = await Api.get(`/api/game/history/${userId}?limit=20`);
            const games: any[] = res.data || [];

            return games.map((g: any) => {
                const isPlayer1 = g.player1_id === userId;
                const myScore = isPlayer1 ? g.player1_score : g.player2_score;
                const oppScore = isPlayer1 ? g.player2_score : g.player1_score;

                let result: 'win' | 'loss' | 'draw';
                if (g.winner_id === userId) result = 'win';
                else if (g.winner_id === 0 && myScore === oppScore) result = 'draw';
                else result = 'loss';

                // Opponent Name Logic (simplified port)
                let opponent = 'Unknown';
                if (g.game_mode === 'tournament' && g.tournament_match_id) {
                    opponent = isPlayer1 ? g.player2_name : g.player1_name;
                    if (!opponent) opponent = (g.player2_id === 0 || g.player1_id === 0) ? 'AI' : 'Opponent';
                } else {
                    opponent = isPlayer1 ? (g.player2_name || (g.player2_id === 0 ? 'AI' : `User ${g.player2_id}`))
                        : (g.player1_name || (g.player1_id === 0 ? 'AI' : `User ${g.player1_id}`));
                }

                return {
                    id: g.id,
                    opponent: opponent,
                    result: result,
                    score: `${myScore}-${oppScore}`,
                    date: g.finished_at || g.started_at,
                    gameMode: g.game_mode || 'general'
                };
            });
        } catch (e) {
            console.warn('Failed to load history', e);
            return [];
        }
    }

    public async getTournamentRankings(userId: number): Promise<TournamentRanking[]> {
        try {
            const res = await Api.get(`/api/tournament/user/${userId}/rankings`);
            const data: any[] = res.data || [];

            return data.map((r: any) => ({
                tournamentName: r.tournamentName,
                date: r.date,
                rank: r.rank,
                totalParticipants: r.totalParticipants,
                status: r.status,
                isWinner: r.isWinner
            }));
        } catch (e) {
            console.warn('Failed to load tournament rankings', e);
            return [];
        }
    }
}
