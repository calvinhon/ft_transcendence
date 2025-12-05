// frontend/src/managers/tournament/TournamentMatchManager.ts
// Handles match playing, side selection, and result recording
import { logger } from '../../utils/Logger';

import { showToast } from '../../toast';
import { authService } from '../../core/authService';
import { appManager } from '../app/app-manager';

export class TournamentMatchManager {
  private dataManager: any;
  private networkManager: any;

  constructor(dataManager: any, networkManager: any) {
    this.dataManager = dataManager;
    this.networkManager = networkManager;
  }

  public async playMatch(tournamentId: number, matchId: number, player1Id: number, player2Id: number): Promise<void> {
    console.log('Playing tournament match:', { tournamentId, matchId, player1Id, player2Id });

    // Close bracket modal
    const modal = document.getElementById('tournament-bracket-modal');
    if (modal) {
      modal.remove();
    }

    // Navigate to game screen with tournament mode
    const app = appManager as any;
    const currentUser = authService?.getCurrentUser();

    if (app && app.startGame && currentUser) {
      // Check if current user is player 1 or player 2
      const isPlayer1 = currentUser.userId === player1Id;
      const isPlayer2 = currentUser.userId === player2Id;

      if (!isPlayer1 && !isPlayer2) {
        // Spectator mode - not implemented yet
        showToast('You are not a participant in this match', 'error');
        return;
      }

      // Show side selection dialog
      const sideChoice = await this.showSideSelectionDialog(
        player1Id,
        player2Id,
        this.dataManager.getParticipantName(player1Id),
        this.dataManager.getParticipantName(player2Id),
        currentUser.userId
      );

      // If user cancelled, don't start the match
      if (!sideChoice) {
        return;
      }

      // Apply side swap if user chose right side
      let finalPlayer1Id = player1Id;
      let finalPlayer2Id = player2Id;
      let finalPlayer1Name = this.dataManager.getParticipantName(player1Id);
      let finalPlayer2Name = this.dataManager.getParticipantName(player2Id);

      if (sideChoice === 'swap') {
        // Swap the players
        finalPlayer1Id = player2Id;
        finalPlayer2Id = player1Id;
        finalPlayer1Name = this.dataManager.getParticipantName(player2Id);
        finalPlayer2Name = this.dataManager.getParticipantName(player1Id);
        console.log('🔄 [Tournament] Players swapped - User chose RIGHT side');
      } else {
        console.log('✅ [Tournament] Players in original order - User chose LEFT side');
      }

      // Set tournament match data with player names and IDs
      app.currentTournamentMatch = {
        tournamentId,
        matchId,
        player1Id: finalPlayer1Id,
        player2Id: finalPlayer2Id,
        player1Name: finalPlayer1Name,
        player2Name: finalPlayer2Name,
        originalPlayer1Id: player1Id, // Keep original for result recording
        originalPlayer2Id: player2Id
      };

      // Set game mode to tournament
      app.gameSettings = app.gameSettings || {};
      app.gameSettings.gameMode = 'tournament';

      // DON'T clear localPlayers - preserve them for faster restart
      // app.localPlayers should persist across matches
      console.log('🏆 [Tournament] Preserving localPlayers for match restart');

      console.log('🏆 [Tournament] Setting up players for match');
      console.log('🏆 [Tournament] Current user:', currentUser.userId);
      console.log('🏆 [Tournament] Player 1 (LEFT):', finalPlayer1Id, finalPlayer1Name);
      console.log('🏆 [Tournament] Player 2 (RIGHT):', finalPlayer2Id, finalPlayer2Name);

      // Start the game
      await app.startGame();
    } else {
      showToast('Game start failed', 'error');
    }
  }

  public async playMatchFromCard(tournamentId: number, matchId: number): Promise<void> {
    console.log('Playing tournament match from card:', { tournamentId, matchId });

    // Get the current player arrangement from the card
    const matchCard = document.querySelector(`.match-card[data-match-id="${matchId}"]`) as HTMLElement;
    if (!matchCard) {
      logger.error('tournament-match-manager', 'Match card not found');
      return;
    }

    const leftPlayer = matchCard.querySelector('.left-slot .match-player') as HTMLElement;
    const rightPlayer = matchCard.querySelector('.right-slot .match-player') as HTMLElement;

    if (!leftPlayer || !rightPlayer) {
      logger.error('tournament-match-manager', 'Player elements not found');
      return;
    }

    const leftPlayerId = parseInt(leftPlayer.getAttribute('data-player-id') || '0');
    const rightPlayerId = parseInt(rightPlayer.getAttribute('data-player-id') || '0');
    const leftPlayerName = leftPlayer.getAttribute('data-player-name') || `Player ${leftPlayerId}`;
    const rightPlayerName = rightPlayer.getAttribute('data-player-name') || `Player ${rightPlayerId}`;

    // Determine original player IDs from the data attributes
    const leftOriginalSide = leftPlayer.getAttribute('data-original-side');
    const rightOriginalSide = rightPlayer.getAttribute('data-original-side');

    // Determine the true original player1 and player2 based on original sides
    let originalPlayer1Id: number;
    let originalPlayer2Id: number;

    if (leftOriginalSide === 'left') {
      // Left player is original player1
      originalPlayer1Id = leftPlayerId;
      originalPlayer2Id = rightPlayerId;
    } else {
      // Left player was originally on right (swapped)
      originalPlayer1Id = rightPlayerId;
      originalPlayer2Id = leftPlayerId;
    }

    console.log('🎮 Starting match with current arrangement:', {
      leftSide: { id: leftPlayerId, name: leftPlayerName, originalSide: leftOriginalSide },
      rightSide: { id: rightPlayerId, name: rightPlayerName, originalSide: rightOriginalSide },
      originalPlayer1Id,
      originalPlayer2Id
    });

    // Close bracket modal
    const modal = document.getElementById('tournament-bracket-modal');
    if (modal) {
      modal.remove();
    }

    // Navigate to game screen with tournament mode
    const app = (window as any).app;
    const currentUser = authService?.getCurrentUser();

    if (app && app.startGame && currentUser) {
      // In local multiplayer mode, the host can play any match
      // No need to validate participation - host controls the tournament
      console.log('🎮 [Tournament] Starting match:', {
        currentUserId: currentUser.userId,
        leftPlayerId,
        rightPlayerId,
        leftPlayerName,
        rightPlayerName
      });

      // Set tournament match data
      app.currentTournamentMatch = {
        tournamentId,
        matchId,
        player1Id: leftPlayerId, // Current left player (game player1)
        player2Id: rightPlayerId, // Current right player (game player2)
        player1Name: leftPlayerName,
        player2Name: rightPlayerName,
        originalPlayer1Id, // Original tournament player1_id
        originalPlayer2Id  // Original tournament player2_id
      };

      // Set game mode to tournament
      app.gameSettings = app.gameSettings || {};
      app.gameSettings.gameMode = 'tournament';

      // DON'T clear localPlayers - preserve them for faster restart
      // app.localPlayers should persist across matches
      console.log('🏆 [Tournament] Preserving localPlayers for match restart');

      console.log('🏆 [Tournament] Setting up players for match');
      console.log('🏆 [Tournament] Current user:', currentUser.userId);
      console.log('🏆 [Tournament] Player 1 (LEFT):', leftPlayerId, leftPlayerName);
      console.log('🏆 [Tournament] Player 2 (RIGHT):', rightPlayerId, rightPlayerName);
      console.log('🏆 [Tournament] Original IDs:', { originalPlayer1Id, originalPlayer2Id });

      // Start the game
      await app.startGame();
    } else {
      showToast('Game start failed', 'error');
    }
  }

  private showSideSelectionDialog(
    player1Id: number,
    player2Id: number,
    player1Name: string,
    player2Name: string,
    currentUserId: number
  ): Promise<'keep' | 'swap' | null> {
    return new Promise((resolve) => {
      // Create modal backdrop
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
      `;

      // Determine current user's name and opponent's name
      const isCurrentPlayer1 = currentUserId === player1Id;
      const currentUserName = isCurrentPlayer1 ? player1Name : player2Name;
      const opponentName = isCurrentPlayer1 ? player2Name : player1Name;

      // Create modal content
      const modalContent = document.createElement('div');
      modalContent.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 20px;
        padding: 40px;
        max-width: 600px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        color: white;
        text-align: center;
      `;

      modalContent.innerHTML = `
        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 32px; margin-bottom: 10px; font-weight: bold;">
            ⚔️ Choose Your Side
          </h2>
          <p style="font-size: 18px; opacity: 0.9;">
            Select which side you want to play on
          </p>
        </div>

        <div style="display: flex; gap: 20px; margin-bottom: 30px; justify-content: center;">
          <button id="side-left-btn" class="side-choice-btn" style="
            flex: 1;
            max-width: 250px;
            padding: 30px 20px;
            background: rgba(255, 255, 255, 0.15);
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 15px;
            color: white;
            font-size: 18px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
          ">
            <div style="font-size: 48px; margin-bottom: 10px;">⬅️</div>
            <div style="font-weight: bold; margin-bottom: 8px;">LEFT SIDE</div>
            <div style="font-size: 14px; opacity: 0.8; margin-bottom: 8px;">Controls: W/S or ↑/↓</div>
            <div style="font-size: 16px; font-weight: bold; color: #ffd700;">
              ${isCurrentPlayer1 ? currentUserName : opponentName}
            </div>
          </button>

          <button id="side-right-btn" class="side-choice-btn" style="
            flex: 1;
            max-width: 250px;
            padding: 30px 20px;
            background: rgba(255, 255, 255, 0.15);
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 15px;
            color: white;
            font-size: 18px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
          ">
            <div style="font-size: 48px; margin-bottom: 10px;">➡️</div>
            <div style="font-weight: bold; margin-bottom: 8px;">RIGHT SIDE</div>
            <div style="font-size: 14px; opacity: 0.8; margin-bottom: 8px;">Controls: U/J</div>
            <div style="font-size: 16px; font-weight: bold; color: #ffd700;">
              ${isCurrentPlayer1 ? opponentName : currentUserName}
            </div>
          </button>
        </div>

        <button id="cancel-side-btn" style="
          padding: 12px 30px;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 10px;
          color: white;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
        ">
          Cancel
        </button>
      `;

      backdrop.appendChild(modalContent);
      document.body.appendChild(backdrop);

      // Add hover effects
      const leftBtn = modalContent.querySelector('#side-left-btn') as HTMLElement;
      const rightBtn = modalContent.querySelector('#side-right-btn') as HTMLElement;
      const cancelBtn = modalContent.querySelector('#cancel-side-btn') as HTMLElement;

      const addHoverEffect = (btn: HTMLElement) => {
        btn.addEventListener('mouseenter', () => {
          btn.style.background = 'rgba(255, 255, 255, 0.25)';
          btn.style.border = '3px solid rgba(255, 255, 255, 0.6)';
          btn.style.transform = 'scale(1.05)';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.background = 'rgba(255, 255, 255, 0.15)';
          btn.style.border = '3px solid rgba(255, 255, 255, 0.3)';
          btn.style.transform = 'scale(1)';
        });
      };

      addHoverEffect(leftBtn);
      addHoverEffect(rightBtn);

      cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        cancelBtn.style.border = '2px solid rgba(255, 255, 255, 0.5)';
      });
      cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        cancelBtn.style.border = '2px solid rgba(255, 255, 255, 0.3)';
      });

      // Handle button clicks
      leftBtn.addEventListener('click', () => {
        backdrop.remove();
        // If current user is player1, keep order. If player2, swap.
        resolve(isCurrentPlayer1 ? 'keep' : 'swap');
      });

      rightBtn.addEventListener('click', () => {
        backdrop.remove();
        // If current user is player1, swap. If player2, keep order.
        resolve(isCurrentPlayer1 ? 'swap' : 'keep');
      });

      cancelBtn.addEventListener('click', () => {
        backdrop.remove();
        resolve(null);
      });

      // Allow ESC key to cancel
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          backdrop.remove();
          resolve(null);
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);
    });
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
      await this.networkManager.recordMatchResult(tournamentId, matchId, winnerId, player1Score, player2Score);
      showToast('Match result recorded', 'success');

      // Wait a moment for backend to process next round creation
      await new Promise(resolve => setTimeout(resolve, 500));

      // Reload tournament to check if it's finished and show updated bracket
      const details = await this.networkManager.viewTournament(tournamentId);
      this.dataManager.setParticipantMap(details.participants.reduce((map: { [key: number]: string }, p: any) => {
        map[p.user_id] = p.username || `Player ${p.user_id}`;
        return map;
      }, {}));

      // Show updated bracket with new match statuses
      // This will be handled by the orchestrator
      return details;

    } catch (error) {
      logger.error('tournament-match-manager', 'Record match result error', error);
      showToast(`Error: ${error instanceof Error ? error.message : 'Failed to record result'}`, 'error');
      throw error;
    }
  }

  public async recordOnBlockchain(tournamentId: number, winnerId: number): Promise<void> {
    try {
      const result = await this.networkManager.recordOnBlockchain(tournamentId, winnerId);
      showToast(`Tournament recorded on blockchain! TX: ${result.transactionHash?.substring(0, 10)}...`, 'success');
    } catch (error) {
      logger.error('tournament-match-manager', 'Blockchain recording error', error);
      showToast('Failed to record on blockchain', 'error');
    }
  }
}