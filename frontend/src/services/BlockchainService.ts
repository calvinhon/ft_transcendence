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

    public async recordOnBlockchain(tournamentId: number, players: number[], ranks: number[]): Promise<TransactionResult> {
        const user = App.getInstance().currentUser;
        if (!user) {
            return { success: false, error: 'User not logged in' };
        }

        try {
            // Server-side call: tournament-service computes ranks and calls blockchain-service internally.
            // Keep signature for compatibility with existing callers.
            const res = await Api.post(`/api/tournament/tournaments/${tournamentId}/blockchain/record`, {});

            const success = !!(res && (res.ok === true || res.ok === 'true'));
            const txHash = res?.txHash || res?.transactionHash || undefined;

            window.dispatchEvent(new CustomEvent('blockchain', {
                detail: { success, message: success ? 'Rankings recorded on blockchain' : (res?.error || 'Recording failed'), response: res }
            }));

            return { success, transactionHash: txHash, error: success ? undefined : (res?.error || 'Failed') };
        } catch (err: any) {
            window.dispatchEvent(new CustomEvent('blockchain', {
                detail: { success: false, message: 'Blockchain recording failed', error: err }
            }));
            return { success: false, error: String(err?.message ?? err) };
        }
    }
}
