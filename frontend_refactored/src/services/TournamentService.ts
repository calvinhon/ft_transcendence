import { Api } from '../core/Api';

export interface Tournament {
    id: string;
    name: string;
    players: string[];
    status: 'pending' | 'active' | 'completed';
}

export class TournamentService {
    public static async create(name: string, players: string[]): Promise<Tournament> {
        return Api.post('/api/tournament/create', { name, players });
    }

    public static async get(id: string): Promise<Tournament> {
        return Api.get(`/api/tournament/${id}`);
    }

    public static async list(): Promise<Tournament[]> {
        return Api.get('/api/tournament/list');
    }
}
