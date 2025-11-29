import { PlayerManager } from '../../managers/PlayerManager';
import { LocalPlayer } from '../../types';
import { logger } from '../../utils/Logger';

describe('PlayerManager', () => {
  let playerManager: PlayerManager;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset singleton instance
    (PlayerManager as any).instance = null;
    playerManager = PlayerManager.getInstance();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('should be a singleton', () => {
    const instance1 = PlayerManager.getInstance();
    const instance2 = PlayerManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  test('should initialize with empty local players', () => {
    const localPlayers = playerManager.getLocalPlayers();
    expect(localPlayers).toEqual([]);
  });

  test('should add local player', () => {
    const player: LocalPlayer = {
      id: '1',
      username: 'testuser',
      isCurrentUser: false,
      userId: 123,
      token: 'test-token'
    };
    playerManager.addLocalPlayer(player);

    const localPlayers = playerManager.getLocalPlayers();
    expect(localPlayers).toHaveLength(1);
    expect(localPlayers[0]).toEqual(player);
  });

  test('should remove local player', () => {
    const player: LocalPlayer = {
      id: '1',
      username: 'testuser',
      isCurrentUser: false,
      userId: 123,
      token: 'test-token'
    };
    playerManager.addLocalPlayer(player);
    expect(playerManager.getLocalPlayers()).toHaveLength(1);

    playerManager.removeLocalPlayer('1');
    expect(playerManager.getLocalPlayers()).toHaveLength(0);
  });

  test('should check player selection', () => {
    const player: LocalPlayer = {
      id: '1',
      username: 'testuser',
      isCurrentUser: false,
      userId: 123,
      token: 'test-token'
    };
    playerManager.addLocalPlayer(player);

    expect(playerManager.isPlayerSelected('1')).toBe(false);

    playerManager.setSelectedPlayers(['1']);
    expect(playerManager.isPlayerSelected('1')).toBe(true);
  });

  test('should clear all players', () => {
    const player1: LocalPlayer = {
      id: '1',
      username: 'user1',
      isCurrentUser: false,
      userId: 123,
      token: 'token1'
    };
    const player2: LocalPlayer = {
      id: '2',
      username: 'user2',
      isCurrentUser: false,
      userId: 456,
      token: 'token2'
    };

    playerManager.addLocalPlayer(player1);
    playerManager.addLocalPlayer(player2);
    expect(playerManager.getLocalPlayers()).toHaveLength(2);

    playerManager.clearAllPlayers();
    expect(playerManager.getLocalPlayers()).toHaveLength(0);
  });
});