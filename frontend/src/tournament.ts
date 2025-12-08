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
  participants: { userId: number; username: string }[];
  matches: {
    id: number;
    tournament_id: number;
    round: number;
    match_number: number;
    player1_id: number | null;
    player2_id: number | null;
    player1_username?: string | null;
    player2_username?: string | null;
    winner_id: number | null;
    player1_score: number;
    player2_score: number;
    status: 'pending' | 'completed';
  }[];
}

export class TournamentManager {
  private baseURL = '/api/tournament';
  private lastDetails: TournamentDetails | null = null; // cache for playMatch

  async startTournament(participants: { userId: number; username: string }[]): Promise<void> {
    if (![4, 8].includes(participants.length)) {
      showToast(`Need 4 or 8 players. Currently have ${participants.length}!`, 'error');
      return;
    }

    try {
      const auth = (window as any).authManager;
      const response = await fetch(`${this.baseURL}/create-from-party`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...auth?.getAuthHeaders()
        },
        body: JSON.stringify({ participants })
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(`Error: ${data.error}`, 'error');
        return;
      }

      showToast('Tournament started!', 'success');
      const details: TournamentDetails = {
        tournament: data.tournament,
        participants: participants.map(p => ({ userId: p.userId, username: p.username })),
        matches: data.matches
      };
      this.showBracket(details);
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
      this.showBracket(details);
    } catch {
      showToast('Load failed', 'error');
    }
  }

  private showBracket(details: TournamentDetails): void {
    this.lastDetails = details;

    const modalId = 'tournament-bracket-modal';
    document.getElementById(modalId)?.remove();

    // Group matches by round
    const rounds: Record<number, TournamentDetails['matches']> = {};
    for (const m of details.matches) {
      (rounds[m.round] ||= []).push(m);
    }

    // Use actual unique round numbers to render columns
    const uniqueRounds = Object.keys(rounds).map(Number).sort((a, b) => a - b);
    const maxRound = uniqueRounds.length ? Math.max(...uniqueRounds) : 0;

    const bracketHTML = uniqueRounds.map(r => `
      <div class="bracket-round">
        <h4>${this.roundLabel(r, maxRound)}</h4>
        ${(rounds[r] || []).map(m => this.matchCard(details.tournament, m)).join('')}
      </div>
    `).join('');

    const winnerName = details.tournament.winner_id != null
      ? (details.participants.find(p => p.userId === details.tournament.winner_id)?.username
         || `Player ${details.tournament.winner_id}`)
      : '';

    const html = `
      <div id="${modalId}" class="modal" style="display:flex;">
        <div class="modal-overlay" onclick="document.getElementById('${modalId}')?.remove()"></div>
        <div class="modal-content" style="max-width:1000px;width:90%;color:#00eaff;">
          <div class="modal-header">
            <h2>Tournament #${details.tournament.id}</h2>
            <button class="modal-close" onclick="document.getElementById('${modalId}')?.remove()">×</button>
          </div>
          <div class="modal-body" style="color:#00eaff;">
            <div class="status-line">
              <span class="status status-${details.tournament.status}">${details.tournament.status.toUpperCase()}</span>
              <span>${details.participants.length} players</span>
              ${winnerName ? `<span>Winner: ${this.escape(winnerName)}</span>` : ''}
            </div>
            <div class="bracket">${bracketHTML || '<p>No matches yet</p>'}</div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  }

  private matchCard(t: Tournament, m: any): string {
    const p1 = m.player1_username ?? (m.player1_id != null ? `Player ${m.player1_id}` : 'TBD');
    const p2 = m.player2_username ?? (m.player2_id != null ? `Player ${m.player2_id}` : 'TBD');
    const canPlay = t.status === 'active'
      && m.status === 'pending'
      && m.player1_id != null
      && m.player2_id != null;

    const winnerBadge = m.status === 'completed' && m.winner_id
      ? `<div class="match-winner">Winner: ${
          this.escape(
            m.winner_id === m.player1_id ? (m.player1_username || `Player ${m.player1_id}`) :
            m.winner_id === m.player2_id ? (m.player2_username || `Player ${m.player2_id}`) :
            `Player ${m.winner_id}`
          )
        }</div>` : '';

    const scoreLine = m.status === 'completed'
      ? `<div class="match-score">Score: ${m.player1_score} - ${m.player2_score}</div>`
      : '';

    return `
      <div class="match-card ${m.status}">
        <div class="match-head" style="color:#00eaff;">
          <span>Match ${m.match_number}</span>
          ${m.status === 'completed' ? '<span class="badge">Done</span>' : ''}
        </div>
        <div class="match-body" style="color:#00eaff;">
          <div class="match-row">
            <span>${this.escape(p1)}</span>
            <span>vs</span>
            <span>${this.escape(p2)}</span>
          </div>
          ${scoreLine}
          ${winnerBadge}
          ${canPlay ? `
            <button class="btn btn-sm"
              onclick="window.tournamentManager.playMatch(${t.id}, ${m.id}, ${m.player1_id}, ${m.player2_id}, '${this.escape(p1)}', '${this.escape(p2)}')">
              Start
            </button>` : ''}
        </div>
      </div>
    `;
  }

  async playMatch(tournamentId: number, matchId: number, player1Id: number, player2Id: number, p1Name: string, p2Name: string): Promise<void> {
    document.getElementById('tournament-bracket-modal')?.remove();
    const app = (window as any).app;
    if (!app?.startGame) {
      showToast('Game unavailable', 'error');
      return;
    }
    app.currentTournamentMatch = {
      tournamentId,
      matchId,
      player1Id,
      player2Id,
      player1Name: p1Name,
      player2Name: p2Name
    };
    app.gameSettings = app.gameSettings || {};
    app.gameSettings.gameMode = 'tournament';
    await app.startGame();
  }

  async recordMatchResult(tournamentId: number, matchId: number, winner_username: string, p1Score: number, p2Score: number): Promise<void> {
    const auth = (window as any).authManager;
    try {
      const res = await fetch(`${this.baseURL}/match/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth.getAuthHeaders() },
        body: JSON.stringify({ matchId, winner_username, player1Score: p1Score, player2Score: p2Score })
      });
      if (!res.ok) throw new Error();
      showToast('Result saved', 'success');
      await this.viewTournament(tournamentId);
    } catch {
      showToast('Record failed', 'error');
    }
  }

  private roundLabel(roundNumber: number, maxRound: number): string {
    const fromEnd = maxRound - roundNumber + 1;
    if (fromEnd === 1) return 'Final';
    if (fromEnd === 2) return 'Semi-Finals';
    if (fromEnd === 3) return 'Quarter-Finals';
    return `Round ${roundNumber}`;
  }

  private escape(text: string): string {
    return text.replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)
    );
  }
}

(window as any).tournamentManager = new TournamentManager();