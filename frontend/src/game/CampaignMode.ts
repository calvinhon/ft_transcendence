// Campaign mode manager - handles all campaign progression and UI

interface GameSettings {
  gameMode: string;
  aiDifficulty: string;
  ballSpeed: string;
  paddleSpeed: string;
  powerupsEnabled: boolean;
  accelerateOnHit: boolean;
  scoreToWin: number;
}

export class CampaignMode {
  private currentLevel: number = 1;
  private maxLevel: number = 21;
  private isActive: boolean = false;
  
  constructor() {
    this.currentLevel = this.loadPlayerCampaignLevel();
  }
  
  public getCurrentLevel(): number {
    return this.currentLevel;
  }
  
  public getMaxLevel(): number {
    return this.maxLevel;
  }
  
  public isInCampaignMode(): boolean {
    return this.isActive;
  }
  
  public setActive(active: boolean): void {
    this.isActive = active;
  }
  
  public progressToNextLevel(): void {
    if (this.currentLevel < this.maxLevel) {
      this.currentLevel++;
      this.savePlayerCampaignLevel(this.currentLevel);
      console.log(`📈 Campaign: Progressed to level ${this.currentLevel}`);
    }
  }
  
  public resetToLevel(level: number): void {
    this.currentLevel = Math.max(1, Math.min(level, this.maxLevel));
    this.savePlayerCampaignLevel(this.currentLevel);
  }
  
  private loadPlayerCampaignLevel(): number {
    try {
      const authManager = (window as any).authManager;
      const user = authManager?.getCurrentUser();
      
      if (user && user.userId) {
        // Sync from database asynchronously
        this.syncCampaignLevelFromDatabase().then(() => {
          console.log('Campaign level synced from database');
        }).catch(err => {
          console.error('Failed to sync campaign level:', err);
        });
        
        const savedLevel = localStorage.getItem(`campaignLevel_${user.userId}`);
        if (savedLevel) {
          const level = parseInt(savedLevel, 10);
          if (!isNaN(level) && level >= 1 && level <= this.maxLevel) {
            console.log(`📊 [CAMPAIGN] Loaded level ${level} from localStorage for user ${user.userId}`);
            return level;
          }
        }
      }
      
      console.log('📊 [CAMPAIGN] No saved level found, starting at level 1');
      return 1;
    } catch (error) {
      console.error('Error loading campaign level:', error);
      return 1;
    }
  }
  
  private async syncCampaignLevelFromDatabase(): Promise<void> {
    try {
      const authManager = (window as any).authManager;
      const user = authManager?.getCurrentUser();
      
      if (!user || !user.userId) {
        console.warn('No user logged in, cannot sync campaign level');
        return;
      }
      
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      const response = await fetch(`${protocol}//${window.location.host}/api/user/${user.userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authManager.getToken()}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        if (userData.campaignLevel && typeof userData.campaignLevel === 'number') {
          this.currentLevel = userData.campaignLevel;
          localStorage.setItem(`campaignLevel_${user.userId}`, userData.campaignLevel.toString());
          console.log(`✅ [CAMPAIGN] Synced level ${userData.campaignLevel} from database`);
        }
      } else {
        console.warn('Failed to fetch user campaign level from database');
      }
    } catch (error) {
      console.error('Error syncing campaign level from database:', error);
    }
  }
  
  private savePlayerCampaignLevel(level: number): void {
    try {
      const authManager = (window as any).authManager;
      const user = authManager?.getCurrentUser();
      
      if (user && user.userId) {
        localStorage.setItem(`campaignLevel_${user.userId}`, level.toString());
        console.log(`💾 [CAMPAIGN] Saved level ${level} to localStorage for user ${user.userId}`);
        
        // Also save to database asynchronously
        this.saveCampaignLevelToDatabase(level).catch(err => {
          console.error('Failed to save campaign level to database:', err);
        });
      }
    } catch (error) {
      console.error('Error saving campaign level:', error);
    }
  }
  
  private async saveCampaignLevelToDatabase(level: number): Promise<void> {
    try {
      const authManager = (window as any).authManager;
      const user = authManager?.getCurrentUser();
      
      if (!user || !user.userId) {
        console.warn('No user logged in, cannot save campaign level');
        return;
      }
      
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      const response = await fetch(`${protocol}//${window.location.host}/api/user/${user.userId}/campaign-level`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authManager.getToken()}`
        },
        body: JSON.stringify({ campaignLevel: level })
      });
      
      if (response.ok) {
        console.log(`✅ [CAMPAIGN] Saved level ${level} to database`);
      } else {
        console.warn('Failed to save campaign level to database');
      }
    } catch (error) {
      console.error('Error saving campaign level to database:', error);
    }
  }
  
  public getLevelSettings(): GameSettings {
    const level = this.currentLevel;
    
    // Difficulty scaling:
    // - Levels 1-5: Easy
    // - Levels 6-10: Medium
    // - Levels 11-15: Hard
    // - Levels 16-20: Very Hard (faster ball, faster paddle, accelerate on hit)
    // - Level 21: Final Boss (everything maxed)
    
    let aiDifficulty: string = 'easy';
    let ballSpeed: string = 'slow';
    let paddleSpeed: string = 'slow';
    let accelerateOnHit: boolean = false;
    let scoreToWin: number = 3;
    
    if (level >= 1 && level <= 5) {
      aiDifficulty = 'easy';
      ballSpeed = 'slow';
      paddleSpeed = 'slow';
      scoreToWin = 3;
    } else if (level >= 6 && level <= 10) {
      aiDifficulty = 'medium';
      ballSpeed = 'medium';
      paddleSpeed = 'medium';
      scoreToWin = 5;
    } else if (level >= 11 && level <= 15) {
      aiDifficulty = 'hard';
      ballSpeed = 'fast';
      paddleSpeed = 'fast';
      scoreToWin = 5;
    } else if (level >= 16 && level <= 20) {
      aiDifficulty = 'hard';
      ballSpeed = 'fast';
      paddleSpeed = 'fast';
      accelerateOnHit = true;
      scoreToWin = 7;
    } else if (level === 21) {
      // Final boss level
      aiDifficulty = 'hard';
      ballSpeed = 'fast';
      paddleSpeed = 'fast';
      accelerateOnHit = true;
      scoreToWin = 10;
    }
    
    return {
      gameMode: 'coop',
      aiDifficulty,
      ballSpeed,
      paddleSpeed,
      powerupsEnabled: false,
      accelerateOnHit,
      scoreToWin
    };
  }
  
  public updateUI(): void {
    const levelDisplay = document.getElementById('campaign-level-display');
    if (levelDisplay) {
      levelDisplay.textContent = `Level ${this.currentLevel}`;
    }
    
    const progressText = document.getElementById('campaign-progress-text');
    if (progressText) {
      progressText.textContent = `${this.currentLevel} / ${this.maxLevel}`;
    }
    
    const progressBar = document.getElementById('campaign-progress-bar');
    if (progressBar) {
      const percentage = (this.currentLevel / this.maxLevel) * 100;
      progressBar.style.width = `${percentage}%`;
    }
  }
  
  public showLevelUpMessage(onContinue: () => void): void {
    const overlay = document.createElement('div');
    overlay.id = 'level-up-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px;
      border-radius: 20px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      max-width: 500px;
      animation: slideIn 0.5s ease-out;
    `;
    
    modal.innerHTML = `
      <h1 style="color: white; font-size: 48px; margin: 0 0 20px 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
        🎉 LEVEL UP! 🎉
      </h1>
      <p style="color: white; font-size: 32px; margin: 10px 0; font-weight: bold;">
        Level ${this.currentLevel}
      </p>
      <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 20px 0;">
        ${this.currentLevel === this.maxLevel ? '🏆 You\'ve completed all levels! You are a true champion!' : 'Get ready for the next challenge!'}
      </p>
      <button id="continue-btn" style="
        background: white;
        color: #667eea;
        border: none;
        padding: 15px 40px;
        font-size: 20px;
        font-weight: bold;
        border-radius: 30px;
        cursor: pointer;
        margin-top: 20px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        transition: transform 0.2s;
      ">
        ${this.currentLevel === this.maxLevel ? 'Finish' : 'Continue'}
      </button>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
      continueBtn.addEventListener('mouseenter', () => {
        continueBtn.style.transform = 'scale(1.1)';
      });
      continueBtn.addEventListener('mouseleave', () => {
        continueBtn.style.transform = 'scale(1)';
      });
      continueBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
        onContinue();
      });
    }
  }
  
  public showCompleteMessage(): void {
    const overlay = document.createElement('div');
    overlay.id = 'campaign-complete-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      padding: 50px;
      border-radius: 20px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      max-width: 600px;
    `;
    
    modal.innerHTML = `
      <h1 style="color: white; font-size: 60px; margin: 0 0 20px 0;">
        🏆 CAMPAIGN COMPLETE! 🏆
      </h1>
      <p style="color: white; font-size: 24px; margin: 20px 0;">
        Congratulations! You've beaten all ${this.maxLevel} levels!
      </p>
      <button id="finish-campaign-btn" style="
        background: white;
        color: #f5576c;
        border: none;
        padding: 15px 40px;
        font-size: 20px;
        font-weight: bold;
        border-radius: 30px;
        cursor: pointer;
        margin-top: 20px;
      ">
        Back to Menu
      </button>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const finishBtn = document.getElementById('finish-campaign-btn');
    if (finishBtn) {
      finishBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
        const app = (window as any).app;
        if (app && typeof app.showScreen === 'function') {
          app.showScreen('play-config');
        }
      });
    }
  }
  
  public showRetryMessage(onRetry: () => void, onQuit: () => void): void {
    const overlay = document.createElement('div');
    overlay.id = 'retry-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px;
      border-radius: 20px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      max-width: 500px;
    `;
    
    modal.innerHTML = `
      <h1 style="color: white; font-size: 48px; margin: 0 0 20px 0;">
        😞 Level Failed
      </h1>
      <p style="color: white; font-size: 24px; margin: 20px 0;">
        Level ${this.currentLevel}
      </p>
      <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 20px 0;">
        Don't give up! Try again?
      </p>
      <div style="display: flex; gap: 20px; justify-content: center; margin-top: 30px;">
        <button id="retry-btn" style="
          background: white;
          color: #667eea;
          border: none;
          padding: 15px 40px;
          font-size: 20px;
          font-weight: bold;
          border-radius: 30px;
          cursor: pointer;
        ">
          Retry
        </button>
        <button id="quit-btn" style="
          background: rgba(255,255,255,0.3);
          color: white;
          border: 2px solid white;
          padding: 15px 40px;
          font-size: 20px;
          font-weight: bold;
          border-radius: 30px;
          cursor: pointer;
        ">
          Quit
        </button>
      </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const retryBtn = document.getElementById('retry-btn');
    const quitBtn = document.getElementById('quit-btn');
    
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
        onRetry();
      });
    }
    
    if (quitBtn) {
      quitBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
        onQuit();
      });
    }
  }
  
  public cleanupModals(): void {
    const overlayIds = ['level-up-overlay', 'campaign-complete-overlay', 'retry-overlay'];
    overlayIds.forEach(id => {
      const overlay = document.getElementById(id);
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });
  }
}
