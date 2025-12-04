// frontend/src/managers/local-player/LocalPlayerDataManager.ts
// Handles player data management, validation, and duplicate checking

import { authService } from '../../core/authService';
import { playerManager } from '../PlayerManager';
import { sharedFlags } from '../SharedFlags';

interface LocalPlayer {
  id: string;
  username: string;
  isCurrentUser: boolean;
  userId: number;
  token: string;
  email?: string;
  team?: number | string;
}

export class LocalPlayerDataManager {
  constructor() {
    console.log('🏆 [LocalPlayerDataManager] Initialized');
  }

  // Player validation and duplicate checking
  public checkForDuplicates(email: string, username: string, userId?: string): {
    isDuplicate: boolean;
    reason: string;
  } {
    // Prefer the centralized auth service
    const hostUser = authService?.getCurrentUser?.();
    const hostEmail = hostUser?.email;
    const hostUsername = hostUser?.username;
    const hostUserId = hostUser?.userId?.toString();

    console.log('[LocalPlayerDataManager] Duplicate check - Host:', { email: hostEmail, username: hostUsername, userId: hostUserId });
    console.log('[LocalPlayerDataManager] Duplicate check - Input email:', email, 'username:', username, 'userId:', userId);

    // Check against host player
    if (hostUserId && userId && hostUserId === userId) {
      return { isDuplicate: true, reason: 'This is the host player account. Host cannot be added as local player.' };
    }
    if (hostEmail && hostEmail.toLowerCase() === email.toLowerCase()) {
      return { isDuplicate: true, reason: 'Host player is already using this email' };
    }
    if (hostUsername && hostUsername.toLowerCase() === username.toLowerCase()) {
      return { isDuplicate: true, reason: 'Host player is already using this username' };
    }

    // Check against local players array
    // Use the app-level player manager when available
    try {
      const localPlayers = (playerManager && typeof playerManager.getLocalPlayers === 'function') ? playerManager.getLocalPlayers() : [];
      if (localPlayers && localPlayers.length > 0) {
        console.log('[LocalPlayerDataManager] Checking against', localPlayers.length, 'existing local players');
        for (const player of localPlayers) {
          if (player.userId?.toString() === userId) {
            return { isDuplicate: true, reason: `Player ${player.username} is already added` };
          }
          if (player.email && player.email.toLowerCase() === email.toLowerCase()) {
            return { isDuplicate: true, reason: `Player with email ${email} is already added` };
          }
          if (player.username && player.username.toLowerCase() === username.toLowerCase()) {
            return { isDuplicate: true, reason: `Player ${username} is already added` };
          }
        }
      }
    } catch (err) {
      // Fallback to window.app if playerManager isn't available in this context
      const app = (window as any).app;
      if (app?.localPlayers && app.localPlayers.length > 0) {
        for (const player of app.localPlayers) {
          if (player.userId?.toString() === userId) {
            return { isDuplicate: true, reason: `Player ${player.username} is already added` };
          }
          if (player.email && player.email.toLowerCase() === email.toLowerCase()) {
            return { isDuplicate: true, reason: `Player with email ${email} is already added` };
          }
          if (player.username && player.username.toLowerCase() === username.toLowerCase()) {
            return { isDuplicate: true, reason: `Player ${username} is already added` };
          }
        }
      }
    }

    return { isDuplicate: false, reason: '' };
  }

  // Team assignment logic
  public determinePlayerTeam(): number | string {
    let addPlayerTeam: number | string = 1;
    // Prefer sharedFlags over global window variable
    console.log('[LocalPlayerDataManager] sharedFlags.addPlayerTeam value:', sharedFlags?.addPlayerTeam);
    if (sharedFlags && sharedFlags.addPlayerTeam !== undefined) {
      addPlayerTeam = sharedFlags.addPlayerTeam as number | string;
    }
    console.log('[LocalPlayerDataManager] Using addPlayerTeam:', addPlayerTeam);

    // If adding from tournament mode, randomly assign to team 1 or 2 for arcade compatibility
    if (addPlayerTeam === 'tournament') {
      const app = (window as any).app;
      if (app?.localPlayers) {
        // Count existing players in each team to balance them
        const team1Count = app.localPlayers.filter((p: any) => p.team === 1).length + 1; // +1 for host
        const team2Count = app.localPlayers.filter((p: any) => p.team === 2).length + 1; // +1 for AI

        // Assign to team with fewer players, or random if equal
        if (team1Count < team2Count) {
          addPlayerTeam = 1;
        } else if (team2Count < team1Count) {
          addPlayerTeam = 2;
        } else {
          // Equal teams - randomly assign
          addPlayerTeam = Math.random() < 0.5 ? 1 : 2;
        }
        console.log('[LocalPlayerDataManager] Tournament player assigned to team', addPlayerTeam,
                    '(Team 1:', team1Count, '| Team 2:', team2Count, ')');
      }
    }

    return addPlayerTeam;
  }

  // Player creation
  public createPlayerObject(userData: any, token: string, team: number | string): LocalPlayer {
    console.log('[LocalPlayerDataManager] Creating player object...');
    console.log('[LocalPlayerDataManager] Full userData structure:', JSON.stringify(userData, null, 2));

    if (!userData || !userData.userId) {
      throw new Error('User data is missing userId. Please check the response structure.');
    }

    const playerObj: LocalPlayer = {
      id: userData.userId.toString(),
      username: userData.username,
      isCurrentUser: false,
      userId: userData.userId,
      token: token || '',
      email: userData.email,
      team: team
    };

    console.log('[LocalPlayerDataManager] Created player object with team:', playerObj.team, '- Full player:', playerObj);
    return playerObj;
  }

  // Add player to app's localPlayers array
  public addPlayerToApp(player: LocalPlayer): void {
    try {
      if (playerManager && typeof playerManager.addLocalPlayer === 'function') {
        playerManager.addLocalPlayer(player);
        console.log('[LocalPlayerDataManager] Added player via playerManager');
        return;
      }
    } catch (err) {
      // Fall through to window-based fallback
    }

    const app = (window as any).app;
    if (!app.localPlayers) {
      app.localPlayers = [];
    }
    app.localPlayers.push(player);
    console.log('[LocalPlayerDataManager] Total localPlayers count:', app.localPlayers.length);

    // Mark player as selected (highlighted)
    const playerId = player.id;
    if (!app.selectedPlayerIds) {
      app.selectedPlayerIds = new Set();
    }
    app.selectedPlayerIds.add(playerId);
    console.log('[LocalPlayerDataManager] Player marked as selected:', playerId);
  }

  // Input validation
  public validateLoginInput(email: string, password: string): { isValid: boolean; error: string } {
    if (!email || !password) {
      return { isValid: false, error: 'Please fill in all fields.' };
    }
    return { isValid: true, error: '' };
  }

  public validateRegisterInput(username: string, email: string, password: string): { isValid: boolean; error: string } {
    if (!username || !email || !password) {
      return { isValid: false, error: 'Please fill in all fields.' };
    }
    if (password.length < 6) {
      return { isValid: false, error: 'Password must be at least 6 characters.' };
    }
    return { isValid: true, error: '' };
  }

  // Host session management
  public saveHostSession(): { token: string | null; user: any } {
    const hostToken = localStorage.getItem('token');
    const savedHostUser = authService?.getCurrentUser?.();
    console.log('[LocalPlayerDataManager] Saved host token and user for restoration:', savedHostUser);
    return { token: hostToken, user: savedHostUser };
  }

  public restoreHostSession(savedSession: { token: string | null; user: any }): void {
    const { token, user } = savedSession;

    if (token) {
      localStorage.setItem('token', token);
      console.log('[LocalPlayerDataManager] ✅ Restored host token to localStorage');
    }
    if (user) {
      try {
        if (authService && typeof authService.setCurrentUser === 'function') {
          authService.setCurrentUser(user);
          console.log('[LocalPlayerDataManager] ✅ Restored host currentUser:', user.username);
        } else {
          console.warn('[LocalPlayerDataManager] authService.setCurrentUser not available');
        }
      } catch (e) {
        console.warn('[LocalPlayerDataManager] Could not restore currentUser to authService');
      }

      // Update all host player name elements in the DOM
      const hostPlayerNames = [
        document.getElementById('host-player-name'),           // Arcade mode
        document.getElementById('host-player-name-coop'),      // Coop mode
        document.getElementById('host-player-name-tournament') // Tournament mode
      ];

      hostPlayerNames.forEach(element => {
        if (element) {
          element.textContent = user.username;
          console.log('[LocalPlayerDataManager] ✅ Restored host name in element:', element.id, 'to:', user.username);
        }
      });
    }
  }
}