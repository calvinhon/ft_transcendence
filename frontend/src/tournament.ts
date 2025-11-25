import { showToast } from './toast';

interface Tournament {
  id: number;
  current_participants: number;
  status: 'active' | 'finished';
  started_at?: string | null;
  finished_at?: string | null;
  winner_id?: number | null;
}

interface TournamentDetails {
  tournament: Tournament;
  participants: { user_id: number; username: string }[];
  matches: {
    id: number;
    tournament_id: number;
    round: number;
    match_number: number;
    player1_id: number | null;
    player2_id: number | null;
    winner_id: number | null;
    player1_score: number;
    player2_score: number;
    status: 'pending' | 'completed';
  }[];
}

export class TournamentManager {
  private baseURL = '/api/tournament';
  private nameMap: Record<number, string> = {};

  async startTournament(participants: { id: number; username: string }[]): Promise<void> {
    // Validate minimum players
    if (participants.length < 2) {
      showToast('Need at least 2 players', 'error');
      return;
    }

    // Validate power of 2
    if (![2, 4, 8, 16].includes(participants.length)) {
      showToast(`Need 2, 4, 8, or 16 players. Currently have ${participants.length}`, 'error');
      return;
    }

    // Build name map
    participants.forEach(p => {
      this.nameMap[p.id] = p.username;
    });

    try {
      const auth = (window as any).authManager;
      const response = await fetch(`${this.baseURL}/create-from-party`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...auth?.getAuthHeaders()
        },
        body: JSON.stringify({
          participants: participants.map(p => p.id),
        })
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Tournament started!', 'success');
        this.showBracket({
          tournament: data.tournament,
          participants: participants.map(p => ({ user_id: p.id, username: p.username })),
          matches: data.matches
        });
      } else {
        showToast(`Error: ${data.error}`, 'error');
      }
    } catch (err) {
      console.error('Start tournament error:', err);
      showToast('Failed to start tournament', 'error');
    }
  }

  async viewTournament(tournamentId: number): Promise<void> {
    const auth = (window as any).authManager;
    try {
      const res = await fetch(`${this.baseURL}/details/${tournamentId}`, {
        headers: auth ? auth.getAuthHeaders() : {}
      });
      if (!res.ok) throw new Error();
      const details: TournamentDetails = await res.json();
      // Build name map (fallback to Player #id)
      for (const p of details.participants) {
        this.nameMap[p.user_id] = `Player ${p.user_id}`;
      }
      this.showBracket(details);
    } catch {
      showToast('Load failed', 'error');
    }
  }

  private showBracket(details: TournamentDetails): void {
    const modalId = 'tournament-bracket-modal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const rounds: Record<number, any[]> = {};
    details.matches.forEach(m => {
      if (!rounds[m.round]) rounds[m.round] = [];
      rounds[m.round].push(m);
    });
    const orderedRounds = Object.keys(rounds).map(Number).sort((a, b) => a - b);

    const bracketHTML = orderedRounds.map(r => `
      <div class="bracket-round">
        <h4>${this.roundLabel(r, orderedRounds.length)}</h4>
        ${rounds[r].map(m => this.matchCard(details.tournament, m)).join('')}
      </div>
    `).join('');

    const html = `
      <div id="${modalId}" class="modal" style="display:flex;">
        <div class="modal-overlay" onclick="document.getElementById('${modalId}')?.remove()"></div>
        <div class="modal-content" style="max-width:1000px;width:90%;">
          <div class="modal-header">
            <h2>Tournament #${details.tournament.id}</h2>
            <button class="modal-close" onclick="document.getElementById('${modalId}')?.remove()">×</button>
          </div>
          <div class="modal-body">
            <div class="status-line">
              <span class="status status-${details.tournament.status}">${details.tournament.status.toUpperCase()}</span>
              <span>${details.participants.length} players</span>
              ${details.tournament.winner_id ? `<span>Winner: ${this.displayName(details.tournament.winner_id)}</span>` : ''}
            </div>
            <div class="bracket">${bracketHTML || '<p>No matches yet</p>'}</div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  }

  private matchCard(t: Tournament, m: any): string {
    const p1 = m.player1_id ? this.displayName(m.player1_id) : 'BYE';
    const p2 = m.player2_id ? this.displayName(m.player2_id) : 'BYE';
    const canPlay = t.status === 'active' && m.status === 'pending' && m.player1_id && m.player2_id;
    return `
      <div class="match-card ${m.status}">
        <div class="match-head">
          <span>Match ${m.match_number}</span>
          ${m.status === 'completed' ? '<span class="badge">Done</span>' : ''}
        </div>
        <div class="match-body">
          <div class="match-row">
            <span>${p1}</span>
            <span>vs</span>
            <span>${p2}</span>
          </div>
          ${canPlay ? `
            <button class="btn btn-sm" onclick="window.tournamentManager.playMatch(${t.id}, ${m.id}, ${m.player1_id}, ${m.player2_id})">
              Start
            </button>` : ''}
        </div>
      </div>
    `;
  }

  async playMatch(tournamentId: number, matchId: number, player1Id: number, player2Id: number): Promise<void> {
    // Remove bracket modal
    const modal = document.getElementById('tournament-bracket-modal');
    if (modal) modal.remove();

    const app = (window as any).app;
    if (!app || !app.startGame) {
      showToast('Game unavailable', 'error');
      return;
    }

    app.currentTournamentMatch = {
      tournamentId,
      matchId,
      player1Id,
      player2Id,
      player1Name: this.displayName(player1Id),
      player2Name: this.displayName(player2Id)
    };
    app.gameSettings = app.gameSettings || {};
    app.gameSettings.gameMode = 'tournament';

    await app.startGame();
  }

  // Record result (can be called after game ends)
  async recordMatchResult(tournamentId: number, matchId: number, winnerId: number, p1Score: number, p2Score: number): Promise<void> {
    const auth = (window as any).authManager;
    try {
      const res = await fetch(`${this.baseURL}/match/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth.getAuthHeaders() },
        body: JSON.stringify({ matchId, winnerId, player1Score: p1Score, player2Score: p2Score })
      });
      if (!res.ok) throw new Error();
      showToast('Result saved', 'success');
      // Refresh bracket
      await this.viewTournament(tournamentId);
    } catch {
      showToast('Record failed', 'error');
    }
  }

  private roundLabel(index: number, total: number): string {
    const fromEnd = total - index + 1;
    if (fromEnd === 1) return 'Final';
    if (fromEnd === 2) return 'Semi-Finals';
    if (fromEnd === 3) return 'Quarter-Finals';
    return `Round ${index}`;
  }

  private displayName(id: number): string {
    return this.nameMap[id] || `Player ${id}`;
  }

  private escape(text: string): string {
    return text.replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)
    );
  }
}

(window as any).tournamentManager = new TournamentManager();