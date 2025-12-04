// frontend/src/managers/app/AppSettingsManager.ts
// Handles settings-related functionality for the App

import { logger } from '../../utils/Logger';
import { settingsManager } from '../SettingsManager';
import { GameSettings } from '../../types';

export class AppSettingsManager {
  constructor() {
    logger.info('AppSettingsManager', '🏗️ AppSettingsManager initialized');
  }

  /**
   * Initialize settings
   */
  initializeSettings(): void {
    // Load settings from localStorage or use defaults
    this.loadSettings();

    // Set up settings change listeners
    this.setupSettingsListeners();
  }

  /**
   * Load settings
   */
  loadSettings(): void {
    // Settings are loaded by SettingsManager
    // This method is kept for backward compatibility
  }

  /**
   * Setup settings listeners
   */
  setupSettingsListeners(): void {
    // Listen for settings changes and update UI accordingly
    // This is handled by individual managers now
  }

  /**
   * Save settings
   */
  saveSettings(): void {
    // Settings are saved by SettingsManager
    // This method is kept for backward compatibility
  }

  /**
   * Reset settings to defaults
   */
  resetSettingsToDefaults(): void {
    // Reset all settings to defaults
    settingsManager.resetToDefaults();

    // Update UI to reflect default settings
    this.updateSettingsUI();
  }

  /**
   * Update settings UI
   */
  updateSettingsUI(): void {
    // Update all settings-related UI elements
    this.updateConfigOptions();
    this.updateScoreDisplay();
    this.updateAIDifficultyDisplay();
  }

  /**
   * Update config options
   */
  updateConfigOptions(): void {
    // Update active states for config options based on current settings
    const settings = settingsManager.getSettings();

    // Update AI difficulty
    const aiDifficulty = settings.aiDifficulty || 'medium';
    const aiDifficultyBtn = document.querySelector(`.config-option[data-setting="ai-difficulty"][data-value="${aiDifficulty}"]`) as HTMLElement;
    if (aiDifficultyBtn) {
      aiDifficultyBtn.parentElement?.querySelectorAll('.config-option').forEach(btn => btn.classList.remove('active'));
      aiDifficultyBtn.classList.add('active');
    }

    // Update ball speed
    const ballSpeed = settings.ballSpeed || 'normal';
    const ballSpeedBtn = document.querySelector(`.config-option[data-setting="ball-speed"][data-value="${ballSpeed}"]`) as HTMLElement;
    if (ballSpeedBtn) {
      ballSpeedBtn.parentElement?.querySelectorAll('.config-option').forEach(btn => btn.classList.remove('active'));
      ballSpeedBtn.classList.add('active');
    }

    // Update paddle speed
    const paddleSpeed = settings.paddleSpeed || 'normal';
    const paddleSpeedBtn = document.querySelector(`.config-option[data-setting="paddle-speed"][data-value="${paddleSpeed}"]`) as HTMLElement;
    if (paddleSpeedBtn) {
      paddleSpeedBtn.parentElement?.querySelectorAll('.config-option').forEach(btn => btn.classList.remove('active'));
      paddleSpeedBtn.classList.add('active');
    }

    // Update powerups
    const powerupsEnabled = settings.powerupsEnabled || false;
    const powerupsBtn = document.querySelector(`.config-option[data-setting="powerups-enabled"][data-value="${powerupsEnabled}"]`) as HTMLElement;
    if (powerupsBtn) {
      powerupsBtn.parentElement?.querySelectorAll('.config-option').forEach(btn => btn.classList.remove('active'));
      powerupsBtn.classList.add('active');
    }

    // Update accelerate on hit
    const accelerateOnHit = settings.accelerateOnHit || false;
    const accelerateBtn = document.querySelector(`.config-option[data-setting="accelerate-on-hit"][data-value="${accelerateOnHit}"]`) as HTMLElement;
    if (accelerateBtn) {
      accelerateBtn.parentElement?.querySelectorAll('.config-option').forEach(btn => btn.classList.remove('active'));
      accelerateBtn.classList.add('active');
    }
  }

  /**
   * Update score display
   */
  updateScoreDisplay(): void {
    const scoreDisplay = document.getElementById('score-value');
    const score = settingsManager.getSetting('scoreToWin');
    if (scoreDisplay && score !== undefined) {
      scoreDisplay.textContent = score.toString();
    }
  }

  /**
   * Update AI difficulty display
   */
  updateAIDifficultyDisplay(): void {
    const aiDifficultyDisplay = document.getElementById('ai-difficulty-display');
    const aiDifficulty = settingsManager.getSetting('aiDifficulty') || 'medium';
    if (aiDifficultyDisplay) {
      aiDifficultyDisplay.textContent = aiDifficulty.charAt(0).toUpperCase() + aiDifficulty.slice(1);
    }
  }

  /**
   * Handle settings change
   */
  handleSettingsChange(setting: string, value: any): void {
    // Map string setting names to keyof GameSettings
    const settingMap: { [key: string]: keyof GameSettings } = {
      'aiDifficulty': 'aiDifficulty',
      'ballSpeed': 'ballSpeed',
      'paddleSpeed': 'paddleSpeed',
      'powerupsEnabled': 'powerupsEnabled',
      'accelerateOnHit': 'accelerateOnHit',
      'scoreToWin': 'scoreToWin',
      'gameMode': 'gameMode'
    };

    const settingKey = settingMap[setting] || setting as keyof GameSettings;

    // Update the setting using SettingsManager
    if (settingKey in settingsManager.getSettings()) {
      (settingsManager as any).updateSetting(settingKey, value);
    }

    // Update UI to reflect the change
    this.updateSettingsUI();
  }

  /**
   * Get current settings
   */
  getCurrentSettings(): GameSettings {
    return settingsManager.getSettings();
  }

  /**
   * Export settings
   */
  exportSettings(): string {
    const settings = settingsManager.getSettings();
    return JSON.stringify(settings, null, 2);
  }

  /**
   * Import settings
   */
  importSettings(settingsJson: string): boolean {
    try {
      const settings = JSON.parse(settingsJson);
      // Validate settings object
      if (typeof settings !== 'object' || settings === null) {
        throw new Error('Invalid settings format');
      }

      // Update settings using SettingsManager
      const updates: Partial<GameSettings> = {};
      Object.keys(settings).forEach(key => {
        if (key in settingsManager.getSettings()) {
          (updates as any)[key] = settings[key];
        }
      });

      settingsManager.updateSettings(updates);

      // Update UI
      this.updateSettingsUI();

      return true;
    } catch (error) {
      logger.error('AppSettingsManager', 'Failed to import settings', error);
      return false;
    }
  }
}