import { Api } from '../core/Api';
import { LocalPlayerService } from './LocalPlayerService';
import { AuthService } from './AuthService';

export interface UserProfile {
    id: number;
    userId: number;
    username: string;
    avatarUrl: string | null;
    customAvatar: number;
    bio: string | null;
    country: string | null;
    campaignLevel?: number;
    createdAt: string;
}

export interface GameStats {
    wins: number;
    losses: number;
    totalGames: number;
    winRate: number;
    averageGameDuration: number;
    aiWins: number;
    aiLosses: number;
    humanWins: number;
    humanLosses: number;
}

export interface AIStats {
    aiWins: number;
    aiLosses: number;
    humanWins: number;
    humanLosses: number;
}

export interface RecentGame {
    id: number;
    opponent: string;
    result: 'win' | 'loss';
    score: string;
    date: string;
    gameMode: string;
    teammates?: string;
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
        if (userId <= 0) {
            const name = userId === 0 ? "Al-Ien" : `BOT ${Math.abs(userId)}`;
            return {
                id: userId,
                userId: userId,
                username: name,
                avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=333333&color=ffffff`,
                customAvatar: 0,
                bio: "Automated Opponent Logic Unit",
                country: "CORE",
                createdAt: new Date().toISOString()
            };
        }
        try {
            const data = await Api.get(`/api/user/profile/${userId}`);
            if (!data) return null;

            return {
                id: data.id,
                userId: data.user_id,
                username: data.display_name || data.username || (() => {
                    // Fallback strategies:
                    // 1. Check LocalPlayerService
                    const local = LocalPlayerService.getInstance().getLocalPlayers().find(p => p.userId === data.user_id);
                    if (local) return local.username;

                    // 2. Check Host User in LocalPlayerService
                    const host = LocalPlayerService.getInstance().getHostUser();
                    if (host && host.userId === data.user_id) return host.username;

                    // 3. Check Current Auth User
                    const current = AuthService.getInstance().getCurrentUser();
                    if (current && current.userId === data.user_id) return current.username;

                    // 4. Ultimate Fallback
                    return `User ${data.user_id}`;
                })(),
                avatarUrl: data.avatar_url,
                customAvatar: data.is_custom_avatar,
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
                totalGames: data.totalGames || data.total_games || 0,
                winRate: data.winRate || 0,
                averageGameDuration: data.averageGameDuration || 0,
                aiWins: data.aiWins || 0,
                aiLosses: data.aiLosses || 0,
                humanWins: data.humanWins || 0,
                humanLosses: data.humanLosses || 0
            };
        } catch (e) {
            console.warn('Failed to load stats', e);
            return { wins: 0, losses: 0, totalGames: 0, winRate: 0, averageGameDuration: 0, aiWins: 0, aiLosses: 0, humanWins: 0, humanLosses: 0 };
        }
    }

    public async getRecentGames(userId: number): Promise<RecentGame[]> {
        try {
            const res = await Api.get(`/api/game/history/${userId}?limit=20`);
            const games: any[] = res.data || [];

            return games.map((g: any) => {
                // Ensure IDs are numbers for correct comparison (SQLite may return strings)
                const player1Id = Number(g.player1_id);
                const winnerId = Number(g.winner_id);

                const isPlayer1 = player1Id === userId;
                const myScore = isPlayer1 ? g.player1_score : g.player2_score;
                const oppScore = isPlayer1 ? g.player2_score : g.player1_score;

                // Check if there is a valid winner (null/undefined means aborted/incomplete)
                const hasWinner = g.winner_id !== null && g.winner_id !== undefined;

                let result: 'win' | 'loss';
                let opponent = 'Unknown';
                let teammates = '';

                // Opponent Name Logic (simplified port)
                const getBotName = (id: number) => {
                    if (id === 0) return "Al-Ien";
                    if (id < 0) return `BOT ${Math.abs(id)}`;
                    return `User ${id}`;
                };

                // Simple: if you're the winner, it's a win; otherwise it's a loss
                result = (winnerId === userId) ? 'win' : 'loss';

                // For arcade or tournament mode with team data, we need deeper logic
                if ((g.game_mode === 'arcade' || g.game_mode === 'tournament') && (g.team1_players || g.team2_players)) {
                    try {
                        const team1: any[] = g.team1_players ? JSON.parse(g.team1_players) : [];
                        const team2: any[] = g.team2_players ? JSON.parse(g.team2_players) : [];

                        // Find which team the viewing user is on
                        const inTeam1 = team1.some((p: any) => Number(p.userId || p) === userId);
                        const inTeam2 = team2.some((p: any) => Number(p.userId || p) === userId);

                        // Only apply team outcome logic if game actually finished with a winner
                        if (hasWinner) {
                            // Team 1 matches Player 1's score/win status
                            const team1Won = winnerId === player1Id;

                            if (inTeam1) {
                                result = team1Won ? 'win' : 'loss';
                            } else if (inTeam2) {
                                result = team1Won ? 'loss' : 'win';
                            }
                        } else {
                            // No winner (aborted) -> Loss for everyone
                            result = 'loss';
                        }
                        // If not in either team (spectator logic?), allow fallback

                        const myTeam = inTeam1 ? team1 : team2;
                        const oppTeam = inTeam1 ? team2 : team1;

                        // Get opponent names: all players on opposing team
                        const oppNames = oppTeam.map((p: any) => {
                            if (p.username) return p.username;
                            const id = p.userId || p;
                            if (id === 0) return 'Al-Ien';
                            if (id < 0) return `BOT ${Math.abs(id)}`;
                            return `User ${id}`;
                        });
                        opponent = oppNames.length > 0 ? oppNames.join(' & ') : 'Unknown';

                        // Get teammate names: other players on same team (excluding viewing user)
                        const currentUser = AuthService.getInstance().getCurrentUser();
                        const myName = currentUser?.username;
                        const teammateNames = myTeam
                            .filter((p: any) => Number(p.userId || p) !== userId)
                            .map((p: any) => {
                                if (p.username && p.username !== myName) return p.username;
                                const id = p.userId || p;
                                if (id === 0) return 'Al-Ien';
                                if (id < 0) return `BOT ${Math.abs(id)}`;
                                return `User ${id}`;
                            })
                            .filter((name: string) => name !== myName);
                        teammates = teammateNames.join(' & ');
                    } catch (e) {
                        // Fall back to simple name logic on parse error
                        opponent = isPlayer1 ? (g.player2_name || getBotName(g.player2_id))
                            : (g.player1_name || getBotName(g.player1_id));
                    }
                } else if (g.game_mode === 'tournament' && g.tournament_match_id) {
                    opponent = isPlayer1 ? g.player2_name : g.player1_name;
                    if (!opponent) opponent = (g.player2_id <= 0 || g.player1_id <= 0) ? 'AI' : 'Opponent';
                } else {
                    opponent = isPlayer1 ? (g.player2_name || getBotName(g.player2_id))
                        : (g.player1_name || getBotName(g.player1_id));
                }

                return {
                    id: g.id,
                    opponent: opponent,
                    result: result,
                    score: `${myScore}-${oppScore}`,
                    date: g.finished_at || g.started_at,
                    gameMode: g.game_mode || 'general',
                    teammates: teammates || undefined
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
