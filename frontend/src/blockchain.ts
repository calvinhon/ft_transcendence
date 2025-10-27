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
        alert(`Failed to load blockchain rankings: ${error}`);
      }
    } catch (error) {
      console.error('Blockchain rankings error:', error);
      alert('Failed to load blockchain rankings: Network error');
    }
  }

  private displayBlockchainRankings(rankings: any[]): void {
    const container = document.getElementById('blockchain-rankings');
    if (!container) {
      // Create a modal or section to display rankings
      alert(`Blockchain Rankings:\n${JSON.stringify(rankings, null, 2)}`);
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