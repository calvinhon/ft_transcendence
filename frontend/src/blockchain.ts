// frontend/src/blockchain.ts
import { showToast } from './toast';
// Stub file - blockchain module
// frontend/src/blockchain.ts - TypeScript version of blockchain manager

interface BlockchainTournament {
  id: number;
  name: string;
  prize_pool: number;
  participants: string[];
  winner?: string;
  transaction_hash?: string;
}

interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export class BlockchainManager {
  private baseURL: string = '/api/blockchain';

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Add event listeners for blockchain-related actions
    document.addEventListener('DOMContentLoaded', () => {
      const recordWinBtn = document.getElementById('record-tournament-win');
      if (recordWinBtn) {
        recordWinBtn.addEventListener('click', () => {
          this.recordTournamentWin();
        });
      }

      const viewRankingsBtn = document.getElementById('view-blockchain-rankings');
      if (viewRankingsBtn) {
        viewRankingsBtn.addEventListener('click', () => {
          this.viewBlockchainRankings();
        });
      }
    });
  }

  public async recordTournamentWin(): Promise<void> {
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
      if (!user) {
        showToast('You must be logged in to record tournament wins', 'error');
        return;
      }

    try {
      const response = await fetch(`${this.baseURL}/record-win`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authManager.getAuthHeaders()
        },
        body: JSON.stringify({
          userId: (user.userId || user.id),
          tournamentId: 1, // Placeholder - should be from actual tournament
          prizeName: 'Tournament Victory'
        })
      });

      if (response.ok) {
        const result: TransactionResult = await response.json();
        if (result.success) {
            showToast(`Tournament win recorded on blockchain! Transaction: ${result.transactionHash}`, 'success');
        } else {
            showToast(`Failed to record win: ${result.error}`, 'error');
        }
      } else {
        const error = await response.text();
          showToast(`Failed to record tournament win: ${error}`, 'error');
      }
    } catch (error) {
      console.error('Blockchain record error:', error);
        showToast('Failed to record tournament win: Network error', 'error');
    }
  }

  public async viewBlockchainRankings(): Promise<void> {
    try {
      const authManager = (window as any).authManager;
      const response = await fetch(`${this.baseURL}/rankings`, {
        headers: authManager.getAuthHeaders()
      });

      if (response.ok) {
        const rankings = await response.json();
        this.displayBlockchainRankings(rankings);
      } else {
        const error = await response.text();
          showToast(`Failed to load blockchain rankings: ${error}`, 'error');
      }
    } catch (error) {
      console.error('Blockchain rankings error:', error);
        showToast('Failed to load blockchain rankings: Network error', 'error');
    }
  }

  private displayBlockchainRankings(rankings: any[]): void {
    const container = document.getElementById('blockchain-rankings');
    if (!container) {
      // Create a modal or section to display rankings
        showToast(`Blockchain Rankings:\n${JSON.stringify(rankings, null, 2)}`, 'info');
      return;
    }

    if (rankings.length === 0) {
      container.innerHTML = '<p>No blockchain rankings found</p>';
      return;
    }

    container.innerHTML = rankings.map((ranking, index) => `
      <div class="blockchain-ranking-item">
        <div class="rank">${index + 1}</div>
        <div class="player-info">
          <div class="player-name">${ranking.playerName || 'Unknown Player'}</div>
          <div class="wins">${ranking.wins || 0} blockchain wins</div>
        </div>
        <div class="transaction-hash" title="${ranking.lastTransactionHash || 'No hash'}">
          ${ranking.lastTransactionHash ? ranking.lastTransactionHash.substring(0, 10) + '...' : 'N/A'}
        </div>
      </div>
    `).join('');
  }

  public async getTournamentHistory(): Promise<BlockchainTournament[]> {
    try {
      const authManager = (window as any).authManager;
      const response = await fetch(`${this.baseURL}/tournaments`, {
        headers: authManager.getAuthHeaders()
      });

      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to load blockchain tournament history');
        return [];
      }
    } catch (error) {
      console.error('Blockchain tournament history error:', error);
      return [];
    }
  }

  public async checkTransactionStatus(transactionHash: string): Promise<boolean> {
    try {
      const authManager = (window as any).authManager;
      const response = await fetch(`${this.baseURL}/transaction/${transactionHash}`, {
        headers: authManager.getAuthHeaders()
      });

      if (response.ok) {
        const result = await response.json();
        return result.confirmed || false;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Transaction status check error:', error);
      return false;
    }
  }
}

// Global blockchain manager instance
(window as any).blockchainManager = new BlockchainManager();