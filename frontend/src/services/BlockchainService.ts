import { Api } from '../core/Api';
import { App } from '../core/App';

export interface BlockchainTournament {
    id: number;
    name: string;
    prize_pool: number;
    participants: string[];
    winner?: string;
    transaction_hash?: string;
}

export interface TransactionResult {
    success: boolean;
    transactionHash?: string;
    error?: string;
}

export class BlockchainService {
    private static instance: BlockchainService;
    private baseURL: string = '/api/blockchain';

    private constructor() { }

    public static getInstance(): BlockchainService {
        if (!BlockchainService.instance) {
            BlockchainService.instance = new BlockchainService();
        }
        return BlockchainService.instance;
    }

    public async recordTournamentWin(tournamentId: number, prizeName: string): Promise<TransactionResult> {
        const user = App.getInstance().currentUser;
        if (!user) {
            return { success: false, error: 'User not logged in' };
        }

        try {
            const response = await Api.post(`${this.baseURL}/record-win`, {
                userId: user.userId,
                tournamentId: tournamentId,
                prizeName: prizeName
            });

            if (response.success) {
                return { success: true, transactionHash: response.transactionHash };
            } else {
                return { success: false, error: response.error };
            }
        } catch (error: any) {
            console.error('Blockchain record error:', error);
            return { success: false, error: error.message || 'Network error' };
        }
    }

    public async getRankings(): Promise<any[]> {
        try {
            return await Api.get(`${this.baseURL}/rankings`);
        } catch (error) {
            console.error('Blockchain rankings error:', error);
            return [];
        }
    }

    public async getTournamentHistory(): Promise<BlockchainTournament[]> {
        try {
            return await Api.get(`${this.baseURL}/tournaments`);
        } catch (error) {
            console.error('Blockchain history error:', error);
            return [];
        }
    }

    public async checkTransactionStatus(transactionHash: string): Promise<boolean> {
        try {
            const result = await Api.get(`${this.baseURL}/transaction/${transactionHash}`);
            return result.confirmed || false;
        } catch (error) {
            console.error('Transaction status check error:', error);
            return false;
        }
    }
}
