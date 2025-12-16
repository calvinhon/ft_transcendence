import { showToast } from './toast';

export class TournamentManager {
  private baseURL: string = '/api/tournament';
  private participantMap: { [userId: number]: string } = {};

  constructor() {
    console.log('TournamentManager constructor called');
    
    // Check if running in development mode (direct service access)
    // Use development URL only when explicitly running on a non-standard port
    if (window.location.hostname === 'localhost' && window.location.port && window.location.port !== '80') {
      // Direct service access for development
      this.baseURL = 'http://localhost:3003';
      console.log('TournamentManager: Using direct service URL for development');
    }
    
    // Wait for DOM to be ready before setting up
    if (document.readyState === 'loading') {
      console.log('DOM not ready, waiting for DOMContentLoaded');
      document.addEventListener('DOMContentLoaded', () => {
        console.log('DOMContentLoaded fired, setting up event listeners');
      });
    } else {
      console.log('DOM already ready, setting up event listeners immediately');
    }
  }

  private async createTournamentWithParty(): Promise<void> {
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    
    if (!user) {
      showToast('You must be logged in to create tournaments', 'error');
      return;
    }

    const app = (window as any).app;
    const selectedPlayerIds = Array.from(app.selectedPlayerIds);
    if (![4,8].includes(selectedPlayerIds.length)) {
      showToast('Need 4 or 8 participants to start a tournament', 'error');
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    let tournamentName = `${user.username}'s Tournament - ${dateStr} ${timeStr}`;

    const tournamentData = {
      name: tournamentName,
      createdBy: (user.userId || user.id),
      participants: selectedPlayerIds
    };

    try {
      console.log('📝 Creating tournament with data:', tournamentData);
      
      const createResponse = await fetch(`${this.baseURL}/tournaments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authManager.getAuthHeaders()
        },
        body: JSON.stringify(tournamentData)
      });

      console.log('📤 Create response status:', createResponse.status);
      const createResult = await createResponse.json();
      console.log('📦 Create response body:', createResult);

      if (!createResponse.ok) {
        throw new Error(createResult.error || createResult.message || 'Failed to create tournament');
      }

      const tournamentId = createResult.data.id;
      console.log('✅ Tournament created:', tournamentId);

      console.log('👥 Adding participants:', selectedPlayerIds);
      for (const userId of selectedPlayerIds) {
        const joinResponse = await fetch(`${this.baseURL}/tournaments/${tournamentId}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authManager.getAuthHeaders()
          },
          body: JSON.stringify({ userId })
        });
        
        if (!joinResponse.ok) {
          const joinResult = await joinResponse.json();
          console.error('❌ Failed to add participant:', userId, joinResult);
        } else {
          console.log('✅ Added participant:', userId);
        }
      }

      console.log('🚀 Starting tournament...');
      const startResponse = await fetch(`${this.baseURL}/tournaments/${tournamentId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authManager.getAuthHeaders()
        },
        body: JSON.stringify({})
      });

      const startResult = await startResponse.json();
      console.log('📦 Start response:', startResult);

      if (!startResponse.ok) {
        throw new Error(startResult.error || startResult.message || 'Failed to start tournament');
      }

      console.log('✅ Tournament started:', startResult);

      showToast(`Tournament created with ${selectedPlayerIds.length} players!`, 'success');

      this.viewTournament(tournamentId);
      
    } catch (error) {
      console.error('❌ Create tournament error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast('Failed to create tournament: ' + errorMessage, 'error');
    }
  }

  public async viewTournament(tournamentId: number): Promise<void> {
    try {
      const authManager = (window as any).authManager;
      const response = await fetch(`${this.baseURL}/tournaments/${tournamentId}`, {
        headers: {
          ...authManager.getAuthHeaders()
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load tournament details');
      }

      const details = await response.json();
      console.log('Tournament details (before username fetch):', details);

      const participantsWithNames = await Promise.all(
        details.participants.map(async (p: any) => {
          try {
            const userResponse = await fetch(`/api/auth/profile/${p.user_id}`, {
              credentials: 'include'
            });
            if (userResponse.ok) {
              const result = await userResponse.json();
              if (result.success && result.data) {
                return { ...p, username: result.data.username };
              }
            }
          } catch (err) {
            console.error(`Failed to fetch username for user ${p.user_id}:`, err);
          }
          return { ...p, username: `Player ${p.user_id}` };
        })
      );

      details.participants = participantsWithNames;
      console.log('Tournament details (after username fetch):', details);

      this.showBracketModal(details);
    } catch (error) {
      console.error('View tournament error:', error);
      showToast('Failed to load tournament details', 'error');
    }
  }

  private showBracketModal(details: any): void {
    const { tournament, participants, matches } = details;

    // Create player ID to name map
    this.participantMap = {};
    participants.forEach((p: any) => {
      this.participantMap[p.user_id] = p.username || `Player ${p.user_id}`;
    });

    const modalHTML = `
      <div id="tournament-bracket-modal" class="modal" style="display: flex;">
        <div class="modal-overlay" onclick="document.getElementById('tournament-bracket-modal').remove()"></div>
        <div class="modal-content tournament-bracket-modal" style="max-width: 1200px; width: 90%;">
          <div class="modal-header">
            <h2 class="modal-title">${this.escapeHtml(tournament.name)}</h2>
            <button type="button" class="modal-close" onclick="document.getElementById('tournament-bracket-modal').remove()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="modal-body">
            <div class="tournament-status">
              <span class="status-badge status-${tournament.status}">${tournament.status.toUpperCase()}</span>
              <span>${participants.length} players</span>
              ${tournament.winner_id ? `<span class="winner-badge">🏆 Winner: ${this.participantMap[tournament.winner_id] || 'Unknown'}</span>` : ''}
            </div>

            <div class="tournament-bracket">
              ${this.renderBracket(matches, participants, tournament)}
            </div>

            ${tournament.status === 'finished' ? `
              <div class="tournament-complete">
                <button class="btn btn-primary" onclick="window.tournamentManager.recordOnBlockchain(${tournament.id}, ${tournament.winner_id})">
                  <i class="fas fa-link"></i> Record on Blockchain
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    const existingModal = document.getElementById('tournament-bracket-modal');
    if (existingModal) {
      existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  private renderBracket(matches: any[], participants: any[], tournament: any): string {
    console.log('🎯 Rendering bracket with matches:', matches);
    
    if (!matches || matches.length === 0) {
      return '<div class="empty-state"><p>No matches scheduled yet</p></div>';
    }

    const rounds: { [key: number]: any[] } = {};
    matches.forEach(match => {
      if (!rounds[match.round]) {
        rounds[match.round] = [];
      }
      rounds[match.round].push(match);
    });

    const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);
    console.log('🎯 Rounds:', roundNumbers, 'Grouped:', rounds);
    
    return roundNumbers.map(roundNum => {
      const roundMatches = rounds[roundNum];
      const roundName = this.getRoundName(roundNum, roundNumbers.length);
      
      return `
        <div class="bracket-round">
          <h3 class="round-title">${roundName}</h3>
          <div class="round-matches">
            ${roundMatches.map(match => this.renderMatch(match, tournament)).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  private getRoundName(roundNum: number, totalRounds: number): string {
    const fromEnd = totalRounds - roundNum + 1;
    if (fromEnd === 1) return 'Final';
    if (fromEnd === 2) return 'Semi-Finals';
    if (fromEnd === 3) return 'Quarter-Finals';
    return `Round ${roundNum}`;
  }

  private renderMatch(match: any, tournament: any): string {
    const player1Name = match.player1_id === 0 ? 'BYE' : (this.participantMap[match.player1_id] || `Player ${match.player1_id}`);
    const player2Name = match.player2_id === 0 ? 'BYE' : (this.participantMap[match.player2_id] || `Player ${match.player2_id}`);
    const isCompleted = match.status === 'completed';
    const isPending = match.status === 'pending' && match.player1_id && match.player2_id;
    const isBye = match.player1_id === 0 || match.player2_id === 0;

    return `
      <div class="match-card ${isCompleted ? 'completed' : ''} ${isBye ? 'bye' : ''}" 
           data-match-id="${match.id}"
           data-tournament-id="${tournament.id}">
        <div class="match-header">
          <span class="match-number">Match ${match.match_number}</span>
          ${isCompleted ? '<span class="match-status-badge">✓</span>' : ''}
        </div>
        <div class="match-players-container" data-match-id="${match.id}">
          <div class="match-player-slot left-slot" data-side="left">
            <div class="side-label">
              <span class="side-icon">⬅️</span>
              <span class="side-text">LEFT</span>
              <span class="side-controls">W/S or ↑/↓</span>
            </div>
            <div class="match-player ${match.winner_id === match.player1_id ? 'winner' : ''}"
                 data-player-id="${match.player1_id}"
                 data-player-name="${player1Name}"
                 data-original-side="left">
              <span class="player-name">${player1Name}</span>
              ${isCompleted ? `<span class="player-score">${match.player1_score || 0}</span>` : ''}
            </div>
          </div>
          
          <div class="match-vs">VS</div>
          
          <div class="match-player-slot right-slot" data-side="right">
            <div class="side-label">
              <span class="side-icon">➡️</span>
              <span class="side-text">RIGHT</span>
              <span class="side-controls">U/J</span>
            </div>
            <div class="match-player ${match.winner_id === match.player2_id ? 'winner' : ''}"
                 data-player-id="${match.player2_id}"
                 data-player-name="${player2Name}"
                 data-original-side="right">
              <span class="player-name">${player2Name}</span>
              ${isCompleted ? `<span class="player-score">${match.player2_score || 0}</span>` : ''}
            </div>
          </div>
        </div>
        ${isPending && tournament.status === 'active' ? `
          <button class="btn btn-sm btn-primary match-play-btn" 
                  onclick="window.tournamentManager.playMatchFromCard(${tournament.id}, ${match.id})">
            <i class="fas fa-play"></i> Play Match
          </button>
        ` : ''}
      </div>
    `;
  }

  public async playMatchFromCard(tournamentId: number, matchId: number): Promise<void> {
    console.log('Playing tournament match from card:', { tournamentId, matchId });
    
    const matchCard = document.querySelector(`.match-card[data-match-id="${matchId}"]`) as HTMLElement;
    if (!matchCard) {
      console.error('Match card not found');
      return;
    }

    const leftPlayer = matchCard.querySelector('.left-slot .match-player') as HTMLElement;
    const rightPlayer = matchCard.querySelector('.right-slot .match-player') as HTMLElement;

    if (!leftPlayer || !rightPlayer) {
      console.error('Player elements not found');
      return;
    }

    const leftPlayerId = parseInt(leftPlayer.getAttribute('data-player-id') || '0');
    const rightPlayerId = parseInt(rightPlayer.getAttribute('data-player-id') || '0');
    const leftPlayerName = leftPlayer.getAttribute('data-player-name') || `Player ${leftPlayerId}`;
    const rightPlayerName = rightPlayer.getAttribute('data-player-name') || `Player ${rightPlayerId}`;

    console.log('🎮 Starting match with current arrangement:', {
      leftSide: { id: leftPlayerId, name: leftPlayerName},
      rightSide: { id: rightPlayerId, name: rightPlayerName}
    });

    const modal = document.getElementById('tournament-bracket-modal');
    if (modal) {
      modal.remove();
    }

    const app = (window as any).app;
    const authManager = (window as any).authManager;
    const currentUser = authManager?.getCurrentUser();
    
    if (app && app.startGame && currentUser) {
      console.log('🎮 [Tournament] Starting match:', {
        currentUserId: currentUser.userId,
        leftPlayerId,
        rightPlayerId,
        leftPlayerName,
        rightPlayerName
      });

      app.currentTournamentMatch = {
        tournamentId,
        matchId,
        player1Id: leftPlayerId,
        player2Id: rightPlayerId,
        player1Name: leftPlayerName,
        player2Name: rightPlayerName
      };

      app.gameSettings = app.gameSettings || {};
      app.gameSettings.gameMode = 'tournament';
      
      console.log('🏆 [Tournament] Preserving localPlayers for match restart');
      
      console.log('🏆 [Tournament] Setting up players for match');
      console.log('🏆 [Tournament] Current user:', currentUser.userId);
      console.log('🏆 [Tournament] Player 1 (LEFT):', leftPlayerId, leftPlayerName);
      console.log('🏆 [Tournament] Player 2 (RIGHT):', rightPlayerId, rightPlayerName);

      await app.startGame();
    } else {
      showToast('Game start failed', 'error');
    }
  }

  public async recordMatchResult(tournamentId: number, matchId: number, winnerId: number, player1Score: number, player2Score: number): Promise<void> {
    console.log('🏆 [RECORD] ========== RECORDING MATCH RESULT ==========');
    console.log('🏆 [RECORD] Input parameters:', {
      tournamentId,
      matchId,
      winnerId,
      player1Score,
      player2Score
    });
    
    try {
      const authManager = (window as any).authManager;
      
      const requestBody = {
        winnerId,
        player1Score,
        player2Score
      };
      
      console.log('🏆 [RECORD] Sending to backend:', requestBody);
      
      const response = await fetch(`${this.baseURL}/tournaments/${tournamentId}/matches/${matchId}/result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authManager.getAuthHeaders()
        },
        body: JSON.stringify(requestBody)
      });

      console.log('🏆 [RECORD] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('🏆 [RECORD] Failed to record match result:', errorData);
        throw new Error(errorData.error || 'Failed to record match result');
      }

      const result = await response.json();
      console.log('🏆 [RECORD] Backend response:', result);
      console.log('✅ [RECORD] Match result recorded successfully');
      showToast('Match result recorded', 'success');
      
      // Wait a moment for backend to process next round creation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reload tournament to check if it's finished and show updated bracket
      const detailsResponse = await fetch(`${this.baseURL}/tournaments/${tournamentId}?_=${Date.now()}`, {
        headers: {
          ...authManager.getAuthHeaders()
        }
      });

      if (detailsResponse.ok) {
        const details = await detailsResponse.json();
        console.log('🔄 Reloaded tournament details:', details);
        
        this.showBracketModal(details);
        
        if (details.tournament.status === 'finished' && details.tournament.winner_id) {
          showToast(`Tournament complete! Winner: ${this.participantMap[details.tournament.winner_id]}`, 'success');
        }
      }
      
    } catch (error) {
      console.error('🏆 [TOURNAMENT] Record match result error:', error);
      showToast(`Error: ${error instanceof Error ? error.message : 'Failed to record result'}`, 'error');
      throw error;
    }
  }

  public async recordOnBlockchain(tournamentId: number, winnerId: number): Promise<void> {
    try {
      const authManager = (window as any).authManager;
      const response = await fetch(`${this.baseURL}/blockchain/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authManager.getAuthHeaders()
        },
        body: JSON.stringify({
          tournamentId,
          winnerId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to record on blockchain');
      }

      const result = await response.json();
      console.log('Blockchain recording result:', result);
      
      showToast(`Tournament recorded on blockchain! TX: ${result.transactionHash?.substring(0, 10)}...`, 'success');
    } catch (error) {
      console.error('Blockchain recording error:', error);
      showToast('Failed to record on blockchain', 'error');
    }
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }
}