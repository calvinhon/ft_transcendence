import { GameCoordinator } from '../../managers/game/GameCoordinator';
import { GameLifecycleManager } from '../../managers/game/GameLifecycleManager';
import { GameModeManager } from '../../managers/game/GameModeManager';

// Mock the dependencies
jest.mock('../../managers/GameRenderer');
jest.mock('../../managers/GameInputHandler');
jest.mock('../../managers/GameNetworkManager');
jest.mock('../../managers/GameUIManager');
jest.mock('../../managers/CampaignManager');
jest.mock('../../managers/TournamentGameManager');

// Mock DOM
const mockCanvas = {
  getContext: jest.fn(),
  width: 800,
  height: 600,
  addEventListener: jest.fn(),
  focus: jest.fn(),
  removeEventListener: jest.fn()
};

describe('GameCoordinator', () => {
  let gameCoordinator: GameCoordinator;

  const defaultSettings = {
    gameMode: 'coop' as const,
    aiDifficulty: 'medium' as const,
    ballSpeed: 'medium' as const,
    paddleSpeed: 'medium' as const,
    powerupsEnabled: false,
    accelerateOnHit: false,
    scoreToWin: 3
  };

  beforeAll(() => {
    // Mock document.getElementById to return our mock canvas
    document.getElementById = jest.fn().mockReturnValue(mockCanvas);
  });

  beforeEach(() => {
    // Reset singleton instance before each test
    (GameCoordinator as any).instance = null;
    (GameCoordinator as any).instanceCounter = 0;

    // Create coordinator with default settings
    gameCoordinator = new GameCoordinator(defaultSettings);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with provided settings', () => {
    const settings = gameCoordinator.getGameSettings();
    expect(settings).toEqual(defaultSettings);
  });

  test('should update game settings', () => {
    const newSettings = { ...defaultSettings, scoreToWin: 5 };
    gameCoordinator.setGameSettings(newSettings);
    expect(gameCoordinator.getGameSettings()).toEqual(newSettings);
  });

  test('should calculate ball speed value correctly', () => {
    expect(gameCoordinator.getBallSpeedValue()).toBe(4); // medium = 4

    gameCoordinator.setGameSettings({ ...defaultSettings, ballSpeed: 'slow' });
    expect(gameCoordinator.getBallSpeedValue()).toBe(3);

    gameCoordinator.setGameSettings({ ...defaultSettings, ballSpeed: 'fast' });
    expect(gameCoordinator.getBallSpeedValue()).toBe(7);
  });

  test('should calculate paddle speed value correctly', () => {
    expect(gameCoordinator.getPaddleSpeedValue()).toBe(8); // medium = 8

    gameCoordinator.setGameSettings({ ...defaultSettings, paddleSpeed: 'slow' });
    expect(gameCoordinator.getPaddleSpeedValue()).toBe(5);

    gameCoordinator.setGameSettings({ ...defaultSettings, paddleSpeed: 'fast' });
    expect(gameCoordinator.getPaddleSpeedValue()).toBe(12);
  });

  test('should return AI difficulty', () => {
    expect(gameCoordinator.getAIDifficulty()).toBe('medium');

    gameCoordinator.setGameSettings({ ...defaultSettings, aiDifficulty: 'hard' });
    expect(gameCoordinator.getAIDifficulty()).toBe('hard');
  });

  test('should return accelerate on hit setting', () => {
    expect(gameCoordinator.isAccelerateOnHitEnabled()).toBe(false);

    gameCoordinator.setGameSettings({ ...defaultSettings, accelerateOnHit: true });
    expect(gameCoordinator.isAccelerateOnHitEnabled()).toBe(true);
  });

  test('should return score to win', () => {
    expect(gameCoordinator.getScoreToWin()).toBe(3);

    gameCoordinator.setGameSettings({ ...defaultSettings, scoreToWin: 10 });
    expect(gameCoordinator.getScoreToWin()).toBe(10);
  });

  test('should delegate campaign level to campaign manager', () => {
    // This method is directly implemented in GameCoordinator
    const mockCampaignManager = (gameCoordinator as any).campaignManager;
    mockCampaignManager.getCurrentLevel = jest.fn().mockReturnValue(5);

    const result = gameCoordinator.getCurrentCampaignLevel();

    expect(mockCampaignManager.getCurrentLevel).toHaveBeenCalled();
    expect(result).toBe(5);
  });

  test('should delegate campaign mode check to campaign manager', () => {
    // This method is directly implemented in GameCoordinator
    const mockCampaignManager = (gameCoordinator as any).campaignManager;
    mockCampaignManager.isCampaignActive = jest.fn().mockReturnValue(true);

    const result = gameCoordinator.isInCampaignMode();

    expect(mockCampaignManager.isCampaignActive).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  test('should delegate end campaign to campaign manager', () => {
    const mockCampaignManager = (gameCoordinator as any).campaignManager;
    mockCampaignManager.endCampaign = jest.fn();

    gameCoordinator.endCampaign();

    expect(mockCampaignManager.endCampaign).toHaveBeenCalled();
  });

  test('should set current tournament match', () => {
    const mockMatch = { id: 1, player1Name: 'Player1', player2Name: 'Player2' };

    // Mock the managers
    const mockLifecycleManager = (gameCoordinator as any).lifecycleManager;
    const mockModeManager = (gameCoordinator as any).modeManager;

    mockLifecycleManager.setCurrentTournamentMatch = jest.fn();
    mockModeManager.setCurrentTournamentMatch = jest.fn();

    gameCoordinator.setCurrentTournamentMatch(mockMatch);

    expect(mockLifecycleManager.setCurrentTournamentMatch).toHaveBeenCalledWith(mockMatch);
    expect(mockModeManager.setCurrentTournamentMatch).toHaveBeenCalledWith(mockMatch);
  });
});