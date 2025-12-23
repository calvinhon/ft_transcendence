import { Api } from '../core/Api';
import { App } from '../core/App';

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

    public async recordOnBlockchain(participants: Array<{ tournamentId: number, userId: number, rank: number }>): Promise<TransactionResult> {
        const user = App.getInstance().currentUser;
        if (!user) {
            return { success: false, error: 'User not logged in' };
        }

        try {
            const response = await Api.post(`${this.baseURL}/recordRanks`, {
                participants
            });

            if (response.success)
                return { success: true, transactionHash: response.transactionHash };
            else
                return { success: false, error: response.error };
        } catch (error: any) {
            console.error('Blockchain record error:', error);
            return { success: false, error: error.message || 'Network error' };
        }
    }
}
