import { playerService } from '../core/playerService';
import { appManager } from './app/AppManager';

export class GameUIManager {
  private campaignLevel: number = 1;
  private isCampaignMode: boolean = false;
  private maxCampaignLevel: number = 10;

  public updateCampaignUI(): void {
    // Update level display
    const levelDisplay = document.getElementById('campaign-level-display');
    const levelNumber = document.getElementById('current-level-number');
    const progressBar = document.getElementById('campaign-progress-fill');

    if (levelDisplay && levelNumber) {
      levelNumber.textContent = this.campaignLevel.toString();
      levelDisplay.style.display = this.isCampaignMode ? 'block' : 'none';
    }

    // Update level progress bar
    if (progressBar) {
      const progress = (this.campaignLevel / this.maxCampaignLevel) * 100;
      progressBar.style.width = `${progress}%`;
    }
  }

  public updateArcadeUI(): void {
    // Show arcade mode controls hint
    const selectedPlayers = playerService?.getLocalPlayers().filter((player: any) =>
      playerService.isPlayerSelected(player.id?.toString() || '')
    ) || [];

    const team1Players = selectedPlayers.filter((p: any) => p.team === 1);
    const team2Players = selectedPlayers.filter((p: any) => p.team === 2);

    // Create or update controls display
    let controlsDisplay = document.getElementById('arcade-controls-display');
    if (!controlsDisplay) {
      controlsDisplay = document.createElement('div');
      controlsDisplay.id = 'arcade-controls-display';
      controlsDisplay.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: #77e6ff;
        padding: 15px 30px;
        border-radius: 10px;
        font-size: 14px;
        font-family: 'Orbitron', sans-serif;
        z-index: 100;
        border: 1px solid #77e6ff;
        box-shadow: 0 0 20px rgba(119, 230, 255, 0.3);
      `;
      document.body.appendChild(controlsDisplay);
    }

    const team1KeyHints = ['Q/A', 'W/S', 'E/D'];
    const team2KeyHints = ['U/J', 'I/K', 'O/L'];

    let team1Text = `<span style="color: #77e6ff;">TEAM 1:</span> `;
    team1Players.forEach((player: any, idx: number) => {
      if (idx < 3) {
        team1Text += `${player.username} (${team1KeyHints[idx]}) `;
      }
    });
    if (team1Players.length > 0) {
      team1Text += `<span style="color: #aaa; font-size: 12px;">or ↑/↓</span>`;
    }

    let team2Text = `<span style="color: #e94560;">TEAM 2:</span> `;
    team2Players.forEach((player: any, idx: number) => {
      if (idx < 3) {
        team2Text += `${player.username} (${team2KeyHints[idx]}) `;
      }
    });

    controlsDisplay.innerHTML = `
      <div style="display: flex; gap: 30px; align-items: center;">
        <div>${team1Text}</div>
        <div style="color: #fff;">|</div>
        <div>${team2Text}</div>
      </div>
    `;
  }

  public showLevelUpMessage(onConfirm: () => void): void {
    const message = document.createElement('div');
    message.id = 'level-up-message';
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: #ffffff;
      padding: 30px;
      border-radius: 15px;
      text-align: center;
      font-size: 24px;
      font-weight: bold;
      z-index: 10000;
      border: 2px solid #77e6ff;
      box-shadow: 0 0 30px rgba(119, 230, 255, 0.5);
    `;
    message.innerHTML = `
      <div style="color: #77e6ff; margin-bottom: 10px;">🎯 LEVEL UP!</div>
      <div>Level ${this.campaignLevel}</div>
      <div style="font-size: 16px; margin-top: 10px; color: #cccccc;">
        Get ready for the next challenge!
      </div>
      <button id="next-level-confirm-btn" style="
        margin-top: 20px;
        padding: 12px 24px;
        background: linear-gradient(135deg, #77e6ff, #e94560);
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 18px;
        cursor: pointer;
        font-weight: bold;
        box-shadow: 0 2px 8px rgba(119, 230, 255, 0.3);
      ">Start Next Level</button>
    `;

    document.body.appendChild(message);

    // Add click handler for confirmation button
    const confirmBtn = document.getElementById('next-level-confirm-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        if (message.parentNode) {
          message.parentNode.removeChild(message);
        }
        onConfirm();
      });
    }
  }

  public showCampaignCompleteMessage(): void {
    const message = document.createElement('div');
    message.id = 'campaign-complete-message';
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      color: #ffffff;
      padding: 40px;
      border-radius: 20px;
      text-align: center;
      font-size: 28px;
      font-weight: bold;
      z-index: 10000;
      border: 3px solid #77e6ff;
      box-shadow: 0 0 50px rgba(119, 230, 255, 0.8);
      max-width: 500px;
    `;
    message.innerHTML = `
      <div style="color: #77e6ff; margin-bottom: 15px;">🏆 CAMPAIGN COMPLETE!</div>
      <div style="font-size: 18px; color: #cccccc; margin-bottom: 20px;">
        Congratulations! You have mastered all levels!
      </div>
      <div style="font-size: 16px;">
        🏅 Pong Champion 🏅
      </div>
    `;

    document.body.appendChild(message);

    // Return to main menu after 5 seconds
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
      this.endCampaign();
    }, 5000);
  }

  public showRetryMessage(): void {
    const message = document.createElement('div');
    message.id = 'retry-message';
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(233, 69, 96, 0.9);
      color: #ffffff;
      padding: 30px;
      border-radius: 15px;
      text-align: center;
      font-size: 24px;
      font-weight: bold;
      z-index: 10000;
      border: 2px solid #ff6b8a;
      box-shadow: 0 0 30px rgba(233, 69, 96, 0.5);
    `;
    message.innerHTML = `
      <div style="color: #ff6b8a; margin-bottom: 10px;">💪 TRY AGAIN!</div>
      <div>Level ${this.campaignLevel}</div>
      <div style="font-size: 16px; margin-top: 10px; color: #ffcccc;">
        You can do this! Practice makes perfect!
      </div>
    `;

    document.body.appendChild(message);

    // Remove message after 3 seconds
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
    }, 3000);
  }

  public showArcadeResultMessage(playerWon: boolean, scoreText: string): void {
    const message = document.createElement('div');
    message.id = 'arcade-result-message';
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${playerWon ? 'rgba(119, 230, 255, 0.95)' : 'rgba(233, 69, 96, 0.95)'};
      color: #ffffff;
      padding: 40px;
      border-radius: 20px;
      text-align: center;
      font-size: 32px;
      font-weight: bold;
      z-index: 10000;
      border: 3px solid ${playerWon ? '#77e6ff' : '#ff6b8a'};
      box-shadow: 0 0 40px ${playerWon ? 'rgba(119, 230, 255, 0.6)' : 'rgba(233, 69, 96, 0.6)'};
      min-width: 400px;
    `;
    message.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 20px;">
        ${playerWon ? '🎉' : '😔'}
      </div>
      <div style="color: #ffffff; margin-bottom: 15px;">
        ${playerWon ? 'VICTORY!' : 'DEFEAT'}
      </div>
      <div style="font-size: 24px; margin-top: 10px; color: rgba(255, 255, 255, 0.9);">
        Final Score: ${scoreText}
      </div>
      <div style="font-size: 16px; margin-top: 20px; color: rgba(255, 255, 255, 0.8);">
        ${playerWon ? 'Well played! 🏆' : 'Better luck next time!'}
      </div>
    `;

    document.body.appendChild(message);

    // Remove message after 3 seconds
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
    }, 3000);
  }

  public showTournamentResultMessage(playerWon: boolean, scoreText: string): void {
    const message = document.createElement('div');
    message.id = 'tournament-result-message';
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${playerWon ? 'rgba(255, 215, 0, 0.95)' : 'rgba(233, 69, 96, 0.95)'};
      color: ${playerWon ? '#1a1a1a' : '#ffffff'};
      padding: 40px;
      border-radius: 20px;
      text-align: center;
      font-size: 32px;
      font-weight: bold;
      z-index: 10000;
      border: 3px solid ${playerWon ? '#ffd700' : '#ff6b8a'};
      box-shadow: 0 0 40px ${playerWon ? 'rgba(255, 215, 0, 0.6)' : 'rgba(233, 69, 96, 0.6)'};
      min-width: 400px;
    `;
    message.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 20px;">
        ${playerWon ? '🏆' : '😔'}
      </div>
      <div style="margin-bottom: 15px;">
        ${playerWon ? 'MATCH WON!' : 'MATCH LOST'}
      </div>
      <div style="font-size: 24px; margin-top: 10px; opacity: 0.9;">
        Final Score: ${scoreText}
      </div>
      <div style="font-size: 16px; margin-top: 20px; opacity: 0.8;">
        ${playerWon ? 'Advancing to next round! 🚀' : 'Tournament continues...'}
      </div>
    `;

    document.body.appendChild(message);

    // Remove message after 3 seconds
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
    }, 3000);
  }

  public cleanupCampaignModals(): void {
    const modalIds = [
      'level-up-message',
      'campaign-complete-message',
      'retry-message',
      'arcade-result-message',
      'arcade-controls-display'
    ];

    modalIds.forEach(id => {
      const modal = document.getElementById(id);
      if (modal) {
        modal.remove();
        console.log(`🧹 [UI] Removed modal: ${id}`);
      }
    });

    // Also query for any orphaned modals with these styles
    const orphanedModals = document.querySelectorAll('[style*="z-index: 10000"]');
    orphanedModals.forEach((modal) => {
      const element = modal as HTMLElement;
      if (element.textContent?.includes('LEVEL UP') ||
          element.textContent?.includes('CAMPAIGN COMPLETE') ||
          element.textContent?.includes('TRY AGAIN') ||
          element.textContent?.includes('VICTORY') ||
          element.textContent?.includes('DEFEAT')) {
        element.remove();
        console.log('🧹 [UI] Removed orphaned game modal');
      }
    });
  }

  public setCampaignLevel(level: number): void {
    this.campaignLevel = level;
  }

  public setCampaignMode(isCampaign: boolean): void {
    this.isCampaignMode = isCampaign;
  }

  public getCampaignLevel(): number {
    return this.campaignLevel;
  }

  public isInCampaignMode(): boolean {
    return this.isCampaignMode;
  }

  private endCampaign(): void {
    this.isCampaignMode = false;
    this.campaignLevel = 1;
    console.log('🎯 [CAMPAIGN] Campaign ended');

    // Update UI to hide campaign elements
    this.updateCampaignUI();

    // Navigate back to play config
    if (appManager?.screenManager && typeof appManager.screenManager.showScreen === 'function') {
      appManager.screenManager.showScreen('play-config');
    }
  }
}