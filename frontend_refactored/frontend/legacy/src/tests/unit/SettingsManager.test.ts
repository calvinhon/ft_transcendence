import { SettingsManager } from '../../managers/settings-manager';
import { logger } from '../../utils/Logger';

describe('settings-manager', () => {
  let settingsManager: SettingsManager;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset singleton instance
    (SettingsManager as any).instance = null;
    settingsManager = SettingsManager.getInstance();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('should be a singleton', () => {
    const instance1 = SettingsManager.getInstance();
    const instance2 = SettingsManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  test('should initialize with default settings', () => {
    const settings = settingsManager.getSettings();
    expect(settings).toBeDefined();
    expect(settings.gameMode).toBe('coop');
    expect(settings.scoreToWin).toBe(5);
    expect(settings.aiDifficulty).toBe('easy');
  });

  test('should update settings', () => {
    settingsManager.updateSetting('scoreToWin', 5);
    expect(settingsManager.getSetting('scoreToWin')).toBe(5);
  });

  test('should persist settings to localStorage', () => {
    settingsManager.updateSetting('gameMode', 'arcade');
    // Create new instance to test persistence
    (SettingsManager as any).instance = null;
    const newInstance = SettingsManager.getInstance();
    expect(newInstance.getSetting('gameMode')).toBe('arcade');
  });

  test('should reset settings to defaults', () => {
    settingsManager.updateSetting('scoreToWin', 10);
    settingsManager.updateSetting('gameMode', 'tournament');
    settingsManager.resetToDefaults();

    expect(settingsManager.getSetting('scoreToWin')).toBe(5);
    expect(settingsManager.getSetting('gameMode')).toBe('coop');
  });

  test('should allow updating settings with valid values', () => {
    settingsManager.updateSetting('gameMode', 'arcade');
    expect(settingsManager.getSetting('gameMode')).toBe('arcade');

    settingsManager.updateSetting('scoreToWin', 10);
    expect(settingsManager.getSetting('scoreToWin')).toBe(10);
  });
});