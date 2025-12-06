// frontend/src/managers/SettingsManager.ts
import { GameSettings } from '../types';
import { logger } from '../utils/Logger';
import { eventManager } from '../utils/EventManager';

export class SettingsManager {
  private static instance: SettingsManager;
  private settings: GameSettings;
  private settingsKey = 'gameSettings';

  private constructor() {
    this.settings = this.loadSettings();
  }

  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): GameSettings {
    try {
      const saved = localStorage.getItem(this.settingsKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        logger.info('SettingsManager', 'Loaded settings from localStorage', parsed);
        return { ...this.getDefaultSettings(), ...parsed };
      }
    } catch (error) {
      logger.warn('SettingsManager', 'Failed to load settings from localStorage', error);
    }

    return this.getDefaultSettings();
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(this.settingsKey, JSON.stringify(this.settings));
      logger.debug('SettingsManager', 'Settings saved to localStorage');
    } catch (error) {
      logger.error('SettingsManager', 'Failed to save settings to localStorage', error);
    }
  }

  /**
   * Get default settings
   */
  private getDefaultSettings(): GameSettings {
    return {
      gameMode: 'coop',
      aiDifficulty: 'easy',
      ballSpeed: 'medium',
      paddleSpeed: 'medium',
      powerupsEnabled: false,
      accelerateOnHit: false,
      scoreToWin: 5
    };
  }

  /**
   * Get current settings
   */
  getSettings(): GameSettings {
    return { ...this.settings };
  }

  /**
   * Update a single setting
   */
  updateSetting<K extends keyof GameSettings>(key: K, value: GameSettings[K]): void {
    const oldValue = this.settings[key];
    this.settings[key] = value;

    this.saveSettings();

    logger.info('SettingsManager', `Setting updated: ${key}`, { from: oldValue, to: value });

    // Emit change event
    this.emitChange(key, value, oldValue);
  }

  /**
   * Update multiple settings at once
   */
  updateSettings(updates: Partial<GameSettings>): void {
    const oldSettings = { ...this.settings };

    Object.assign(this.settings, updates);
    this.saveSettings();

    logger.info('SettingsManager', 'Multiple settings updated', { updates, oldSettings });

    // Emit change events for each updated setting
    Object.keys(updates).forEach(key => {
      const k = key as keyof GameSettings;
      this.emitChange(k, updates[k]!, oldSettings[k]);
    });
  }

  /**
   * Reset settings to defaults
   */
  resetToDefaults(): void {
    const oldSettings = { ...this.settings };
    this.settings = this.getDefaultSettings();
    this.saveSettings();

    logger.info('SettingsManager', 'Settings reset to defaults', { oldSettings });

    // Emit reset event
    window.dispatchEvent(new CustomEvent('settingsReset', {
      detail: { oldSettings, newSettings: this.settings }
    }));
  }

  /**
   * Get a specific setting value
   */
  getSetting<K extends keyof GameSettings>(key: K): GameSettings[K] {
    return this.settings[key];
  }

  /**
   * Check if a setting has a specific value
   */
  isSetting<K extends keyof GameSettings>(key: K, value: GameSettings[K]): boolean {
    return this.settings[key] === value;
  }

  /**
   * Toggle a boolean setting
   */
  toggleSetting(key: 'powerupsEnabled' | 'accelerateOnHit'): boolean {
    const currentValue = this.settings[key] as boolean;
    const newValue = !currentValue;
    this.updateSetting(key, newValue as any);
    return newValue;
  }

  /**
   * Increment/decrement score to win
   */
  adjustScoreToWin(delta: number): number {
    const current = this.settings.scoreToWin || 5;
    const newValue = Math.max(1, Math.min(21, current + delta));
    this.updateSetting('scoreToWin', newValue);
    return newValue;
  }

  /**
   * Emit a setting change event
   */
  private emitChange<K extends keyof GameSettings>(
    key: K,
    newValue: GameSettings[K],
    oldValue: GameSettings[K]
  ): void {
    window.dispatchEvent(new CustomEvent('settingChanged', {
      detail: { key, newValue, oldValue }
    }));
  }

  /**
   * Setup DOM event listeners for settings UI
   */
  setupUIListeners(): void {
    // Config option buttons
    eventManager.add('settings', document, 'click', (e: Event) => {
      const target = e.target as HTMLElement;
      const button = target.closest('.config-option, .setting-option') as HTMLElement;

      if (button) {
        const setting = button.getAttribute('data-setting');
        const value = button.getAttribute('data-value');

        if (setting && value) {
          this.handleConfigOption(setting, value, button);
        }
      }
    });

    // Checkbox settings
    const powerupsCheckbox = document.getElementById('powerups-enabled') as HTMLInputElement;
    const accelerateCheckbox = document.getElementById('accelerate-on-hit') as HTMLInputElement;

    if (powerupsCheckbox) {
      eventManager.add('settings', powerupsCheckbox, 'change', (e: Event) => {
        const target = e.target as HTMLInputElement;
        this.updateSetting('powerupsEnabled', target.checked);
      });
    }

    if (accelerateCheckbox) {
      eventManager.add('settings', accelerateCheckbox, 'change', (e: Event) => {
        const target = e.target as HTMLInputElement;
        this.updateSetting('accelerateOnHit', target.checked);
      });
    }

    // Score increment / decrement buttons
    const scoreInc = document.getElementById('score-increment') as HTMLButtonElement;
    const scoreDec = document.getElementById('score-decrement') as HTMLButtonElement;
    if (scoreInc) {
      eventManager.add('settings', scoreInc, 'click', (e: Event) => {
        e.preventDefault();
        const newVal = this.adjustScoreToWin(1);
        // update UI
        const display = document.getElementById('score-value');
        if (display) display.textContent = newVal.toString();
      });
    }
    if (scoreDec) {
      eventManager.add('settings', scoreDec, 'click', (e: Event) => {
        e.preventDefault();
        const newVal = this.adjustScoreToWin(-1);
        const display = document.getElementById('score-value');
        if (display) display.textContent = newVal.toString();
      });
    }

    // Update UI when settings change (centralized)
    window.addEventListener('settingChanged', (ev: Event) => {
      const detail = (ev as CustomEvent).detail;
      if (!detail) return;
      const { key, newValue } = detail;
      if (key === 'scoreToWin') {
        const display = document.getElementById('score-value');
        if (display) display.textContent = String(newValue);
      }
      // Let AppSettingsManager or other UI managers react to other changes
    });

    logger.info('SettingsManager', 'UI listeners setup complete');
  }

  /**
   * Handle config option button clicks
   */
  private handleConfigOption(setting: string, value: string, button: HTMLElement): void {
    // Remove active class from siblings
    const siblings = button.parentElement?.querySelectorAll('.config-option, .setting-option') || [];
    siblings.forEach(sibling => sibling.classList.remove('active'));
    button.classList.add('active');

    // Convert setting names
    const settingMap: { [key: string]: keyof GameSettings } = {
      'ai-difficulty': 'aiDifficulty',
      'ball-speed': 'ballSpeed',
      'paddle-speed': 'paddleSpeed',
      'gameMode': 'gameMode'
    };

    const settingKey = settingMap[setting] || setting;

    // Update setting
    if (settingKey in this.settings) {
      (this.settings as any)[settingKey] = value;
      this.saveSettings();

      logger.info('SettingsManager', `Setting updated via UI: ${settingKey} = ${value}`);

      // Emit change event
      this.emitChange(settingKey as keyof GameSettings, value as any, this.settings[settingKey as keyof GameSettings]);
    }
  }

  /**
   * Update UI to reflect current settings
   */
  updateUI(): void {
    // Convert setting names for data-setting attributes
    const settingMap: { [key: string]: string } = {
      'aiDifficulty': 'ai-difficulty',
      'ballSpeed': 'ball-speed',
      'paddleSpeed': 'paddle-speed',
      'gameMode': 'gameMode'
    };

    // Update active states for config options
    Object.entries(this.settings).forEach(([key, value]) => {
      if (typeof value === 'string') {
        // Use mapped name for data-setting attribute
        const dataSetting = settingMap[key] || key;

        // Remove active from all options for this setting
        document.querySelectorAll(`[data-setting="${dataSetting}"]`).forEach(el => {
          el.classList.remove('active');
        });

        // Add active to current value
        document.querySelectorAll(`[data-setting="${dataSetting}"][data-value="${value}"]`).forEach(el => {
          el.classList.add('active');
        });
      } else if (typeof value === 'boolean') {
        // Map boolean setting keys to element IDs
        const idMap: { [key: string]: string } = {
          'powerupsEnabled': 'powerups-enabled',
          'accelerateOnHit': 'accelerate-on-hit'
        };
        const elementId = idMap[key] || key;
        const checkbox = document.getElementById(elementId) as HTMLInputElement;
        if (checkbox) {
          checkbox.checked = value;
        }
      } else if (typeof value === 'number' && key === 'scoreToWin') {
        const display = document.getElementById('score-value');
        if (display) {
          display.textContent = value.toString();
        }
      }
    });

    logger.debug('SettingsManager', 'UI updated to reflect current settings');
  }

  /**
   * Export settings for debugging
   */
  exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * Import settings from JSON string
   */
  importSettings(jsonString: string): boolean {
    try {
      const imported = JSON.parse(jsonString);
      const validated = { ...this.getDefaultSettings(), ...imported };
      this.settings = validated;
      this.saveSettings();
      this.updateUI();

      logger.info('SettingsManager', 'Settings imported successfully', validated);
      return true;
    } catch (error) {
      logger.error('SettingsManager', 'Failed to import settings', error);
      return false;
    }
  }
}

export const settingsManager = SettingsManager.getInstance();