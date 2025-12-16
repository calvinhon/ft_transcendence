// frontend/src/managers/tournament/TournamentBracketRenderer.ts
// Handles tournament bracket rendering and match display

interface Tournament {
  id: number;
  name: string;
  current_participants: number;
  status: 'open' | 'active' | 'finished' | 'full';
  created_by: number;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  winner_id?: number | null;
}

interface Match {
  id: number;
  tournament_id: number;
  player1_id: number;
  player2_id: number;
  winner_id?: number;
  player1_score?: number;
  player2_score?: number;
  status: 'pending' | 'completed';
  round: number;
  match_number: number;
}

interface Participant {
  user_id: number;
  username: string;
}

export class TournamentBracketRenderer {
  private participantMap: { [userId: number]: string } = {};

  constructor() {
    console.log('🏆 [TournamentBracketRenderer] Initialized');
  }

  // Set participant map for rendering
  public setParticipantMap(participantMap: { [userId: number]: string }): void {
    this.participantMap = participantMap;
  }

  // Main bracket rendering method
  public renderBracket(matches: Match[], participants: Participant[], tournament: Tournament): string {
    console.log('🎯 Rendering bracket with matches:', matches);

    if (!matches || matches.length === 0) {
      return '<div class="empty-state"><p>No matches scheduled yet</p></div>';
    }

    // Group matches by round
    const rounds: { [key: number]: Match[] } = {};
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

  private renderMatch(match: Match, tournament: Tournament): string {
    const player1Name = match.player1_id === 0 ? 'BYE' : (this.participantMap[match.player1_id] || `Player ${match.player1_id}`);
    const player2Name = match.player2_id === 0 ? 'BYE' : (this.participantMap[match.player2_id] || `Player ${match.player2_id}`);
    const isCompleted = match.status === 'completed';
    const isPending = match.status === 'pending' && match.player1_id && match.player2_id;
    const isBye = match.player1_id === 0 || match.player2_id === 0;

    // For pending matches, make players draggable
    const draggableAttr = isPending && tournament.status === 'active' ? 'draggable="true"' : '';
    const dragClass = isPending && tournament.status === 'active' ? 'draggable-player' : '';

    return `
      <div class="match-card ${isCompleted ? 'completed' : ''} ${isBye ? 'bye' : ''}"
           data-match-id="${match.id}"
           data-tournament-id="${tournament.id}">
        <div class="match-header">
          <span class="match-number">Match ${match.match_number}</span>
          ${isCompleted ? '<span class="match-status-badge">✓</span>' : ''}
          ${isPending && tournament.status === 'active' ? '<span class="drag-hint">🔄 Drag to swap sides</span>' : ''}
        </div>
        <div class="match-players-container" data-match-id="${match.id}">
          <div class="match-player-slot left-slot" data-side="left">
            <div class="side-label">
              <span class="side-icon">⬅️</span>
              <span class="side-text">LEFT</span>
              <span class="side-controls">W/S or ↑/↓</span>
            </div>
            <div class="match-player ${match.winner_id === match.player1_id ? 'winner' : ''} ${dragClass}"
                 ${draggableAttr}
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
            <div class="match-player ${match.winner_id === match.player2_id ? 'winner' : ''} ${dragClass}"
                 ${draggableAttr}
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
                  data-action="tournament:play" data-tournament-id="${tournament.id}" data-match-id="${match.id}">
            <i class="fas fa-play"></i> Play Match
          </button>
        ` : ''}
      </div>
    `;
  }

  // Bracket modal rendering
  public renderBracketModal(details: any): string {
    const { tournament, participants, matches } = details;

    // Create player ID to name map
    this.participantMap = {};
    participants.forEach((p: any) => {
      this.participantMap[p.user_id] = p.username || `Player ${p.user_id}`;
    });

    // Create bracket modal
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
                <button class="btn btn-primary" data-action="tournament:record" data-id="${tournament.id}" data-winner="${tournament.winner_id}">
                  <i class="fas fa-link"></i> Record on Blockchain
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    return modalHTML;
  }

  // Utility method for HTML escaping
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

  // Get participant map for external use
  public getParticipantMap(): { [userId: number]: string } {
    return this.participantMap;
  }
}