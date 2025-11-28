// Track if modals have been initialized to prevent duplicate event listeners
let loginModalInitialized = false;
let registerModalInitialized = false;

// Track submission state to prevent double submits
let isSubmittingLogin = false;
let isSubmittingRegister = false;

export function setupLocalPlayerLoginModal(app: any) {
  console.log('🔧 [LocalPlayer] setupLocalPlayerLoginModal() called');

  // Prevent duplicate initialization
  if (loginModalInitialized) {
    console.log('[LocalPlayer] Login modal already initialized, skipping');
    return;
  }

  const loginModal = document.getElementById('local-player-login-modal') as HTMLElement;
  const loginForm = document.getElementById('local-player-login-form') as HTMLFormElement;
  const error = document.getElementById('local-player-login-error') as HTMLElement;

  console.log('[LocalPlayer] Setup - Modal:', loginModal ? '✅ Found' : '❌ Not found');
  console.log('[LocalPlayer] Setup - Form:', loginForm ? '✅ Found' : '❌ Not found');

  if (!loginForm) {
    console.warn('⚠️ [LocalPlayer] Login form not found, cannot setup');
    return;
  }

  // Mark as initialized before adding listeners
  loginModalInitialized = true;
  console.log('[LocalPlayer] Login modal marked as initialized');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Prevent double submission
    if (isSubmittingLogin) {
      console.warn('⚠️ [LocalPlayer] Login already in progress, ignoring duplicate submit');
      return;
    }

    isSubmittingLogin = true;
    console.log('📝 [LocalPlayer] Login form submitted, isSubmittingLogin set to true');

    const emailInput = document.getElementById('local-player-login-email') as HTMLInputElement;
    const passwordInput = document.getElementById('local-player-login-password') as HTMLInputElement;
    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    console.log('[LocalPlayer] Login attempt - Email:', email, 'Password:', password ? '***' : 'empty');

    if (!email || !password) {
      error!.textContent = 'Please fill in all fields.';
      error!.style.display = 'block';
      console.warn('⚠️ [LocalPlayer] Missing email or password');
      isSubmittingLogin = false;  // Reset guard
      return;
    }

    // Enhanced duplicate check: host player and all local players (by email/username and userId)
    const hostUser = (window as any).authManager?.getCurrentUser();
    const hostEmail = hostUser?.email;
    const hostUsername = hostUser?.username;
    const hostUserId = hostUser?.userId?.toString();

    console.log('[LocalPlayer] Duplicate check - Host:', { email: hostEmail, username: hostUsername, userId: hostUserId });
    console.log('[LocalPlayer] Duplicate check - Input email:', email);

    // First, try to authenticate to get the actual user info
    const authManager = (window as any).authManager;
    if (!authManager) {
      error!.textContent = 'Auth system not available.';
      error!.style.display = 'block';
      console.error('❌ [LocalPlayer] AuthManager not available');
      isSubmittingLogin = false;  // Reset guard
      return;
    }

    console.log('[LocalPlayer] Attempting authentication...');

    // Save the host's token AND currentUser before authenticating local player
    const hostToken = localStorage.getItem('token');
    const savedHostUser = authManager.getCurrentUser();
    console.log('[LocalPlayer] Saved host token and user for restoration:', savedHostUser);

    try {
      const result = await authManager.login(email, password);
      console.log('[LocalPlayer] Auth result:', result.success ? '✅ Success' : '❌ Failed', result);
      console.log('[LocalPlayer] Current authManager.currentUser after login:', authManager.currentUser);

      // CRITICAL: Restore the host's token AND currentUser immediately after local player auth
      if (hostToken) {
        localStorage.setItem('token', hostToken);
        console.log('[LocalPlayer] ✅ Restored host token to localStorage');
      }
      if (savedHostUser) {
        console.log('[LocalPlayer] Restoring host user from:', authManager.currentUser?.username, 'to:', savedHostUser.username);
        authManager.currentUser = savedHostUser;
        console.log('[LocalPlayer] ✅ Restored host currentUser:', savedHostUser.username);
        console.log('[LocalPlayer] Verification - authManager.currentUser is now:', authManager.currentUser?.username);

        // CRITICAL: Immediately update all host player name elements in the DOM
        // to ensure they display the correct host username, not the local player's
        const hostPlayerNames = [
          document.getElementById('host-player-name'),           // Arcade mode
          document.getElementById('host-player-name-coop'),      // Coop mode
          document.getElementById('host-player-name-tournament') // Tournament mode
        ];

        hostPlayerNames.forEach(element => {
          if (element) {
            element.textContent = savedHostUser.username;
            console.log('[LocalPlayer] ✅ Restored host name in element:', element.id, 'to:', savedHostUser.username);
          }
        });
      }

      if (!result.success || !result.data) {
        error!.textContent = result.error || 'Login failed.';
        error!.style.display = 'block';
        console.error('❌ [LocalPlayer] Login failed:', result.error);
        isSubmittingLogin = false;  // Reset guard on error
        return;
      }

      // Extract user data from nested structure
      const userData = result.data.user || result.data.data || result.data;
      console.log('[LocalPlayer] Extracted userData:', userData);

      if (!userData || !userData.userId) {
        throw new Error('User data is missing userId. Please check the response structure.');
      }

      const loginUserId = userData.userId.toString();
      const loginUsername = userData.username;
      const loginEmail = userData.email;

      console.log('[LocalPlayer] Authenticated user data:', { userId: loginUserId, username: loginUsername, email: loginEmail });

      // Now check for duplicates using the actual authenticated user data
      let duplicate = false;
      let duplicateReason = '';

      // Check against host player by userId, email, and username
      // Only check if host data is actually available
      if (hostUserId && loginUserId && hostUserId === loginUserId) {
        duplicate = true;
        duplicateReason = 'This is the host player account. Host cannot be added as local player.';
        console.log('[LocalPlayer] Duplicate: userId match with host');
      } else if (hostEmail && loginEmail && hostEmail.toLowerCase() === loginEmail.toLowerCase()) {
        duplicate = true;
        duplicateReason = 'Host player is already using this email';
        console.log('[LocalPlayer] Duplicate: email match with host');
      } else if (hostUsername && loginUsername && hostUsername.toLowerCase() === loginUsername.toLowerCase()) {
        duplicate = true;
        duplicateReason = 'Host player is already using this username';
        console.log('[LocalPlayer] Duplicate: username match with host');
      }

      // Check against local players array
      if (!duplicate && app.localPlayers && app.localPlayers.length > 0) {
        console.log('[LocalPlayer] Checking against', app.localPlayers.length, 'existing local players');
        app.localPlayers.forEach((player: any, index: number) => {
          console.log(`[LocalPlayer] Checking player ${index}:`, {
            userId: player.userId,
            username: player.username,
            email: player.email
          });

          if (player.userId?.toString() === loginUserId) {
            duplicate = true;
            duplicateReason = `Player ${player.username} is already added`;
            console.log('[LocalPlayer] Duplicate: userId match with existing player');
          } else if (player.email && loginEmail && player.email.toLowerCase() === loginEmail.toLowerCase()) {
            duplicate = true;
            duplicateReason = `Player with email ${loginEmail} is already added`;
            console.log('[LocalPlayer] Duplicate: email match with existing player');
          } else if (player.username && loginUsername && player.username.toLowerCase() === loginUsername.toLowerCase()) {
            duplicate = true;
            duplicateReason = `Player ${loginUsername} is already added`;
            console.log('[LocalPlayer] Duplicate: username match with existing player');
          }
        });
      }

      if (duplicate) {
        console.warn('⚠️ [LocalPlayer] Duplicate detected:', duplicateReason);
        error!.textContent = duplicateReason || 'This player is already added.';
        error!.style.display = 'block';
        isSubmittingLogin = false;  // Reset guard
        return;
      }

      console.log('[LocalPlayer] ✅ No duplicates found, proceeding to add player');

      // Prepare to add the player
      if (!app.localPlayers) app.localPlayers = [];

      // Add to correct team (can be 1, 2, or 'tournament')
      let addPlayerTeam: number | string = 1;
      console.log('[LocalPlayer] window.addPlayerTeam value:', (window as any).addPlayerTeam);
      if ((window as any).addPlayerTeam !== undefined) {
        addPlayerTeam = (window as any).addPlayerTeam;
      }
      console.log('[LocalPlayer] Using addPlayerTeam:', addPlayerTeam);

      // If adding from tournament mode, randomly assign to team 1 or 2 for arcade compatibility
      if (addPlayerTeam === 'tournament') {
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
        console.log('[LocalPlayer] Tournament player assigned to team', addPlayerTeam,
          '(Team 1:', team1Count, '| Team 2:', team2Count, ')');
      }

      console.log('[LocalPlayer] Creating player object...');
      console.log('[LocalPlayer] Full result.data structure:', JSON.stringify(result.data, null, 2));


      const playerObj = {
        id: userData.userId.toString(),
        username: userData.username,
        isCurrentUser: false,
        userId: userData.userId,
        token: result.data.token || '',
        email: userData.email || loginEmail,
        team: addPlayerTeam  // Store which team this player belongs to
      };
      console.log('[LocalPlayer] Created player object with team:', playerObj.team, '- Full player:', playerObj);

      // Add player to localPlayers array
      app.localPlayers.push(playerObj);
      console.log('[LocalPlayer] Total localPlayers count:', app.localPlayers.length);

      // Mark player as selected (highlighted)
      const playerId = playerObj.id;
      if (!app.selectedPlayerIds) app.selectedPlayerIds = new Set();
      app.selectedPlayerIds.add(playerId);
      console.log('[LocalPlayer] Player marked as selected:', playerId);

      // Reset submitting guard before closing modal
      isSubmittingLogin = false;
      console.log('[LocalPlayer] Login submitting guard reset');

      // Close modal - use hideLocalPlayerLoginModal for consistency
      hideLocalPlayerLoginModal();
      console.log('🎉 [LocalPlayer] Login successful, modal hidden via hideLocalPlayerLoginModal()');

      // CRITICAL: Ensure host user is restored BEFORE any navigation or display updates
      console.log('[LocalPlayer] Final host user restoration before navigation/updates');
      if (savedHostUser) {
        authManager.currentUser = savedHostUser;
        console.log('[LocalPlayer] Host currentUser restored to:', savedHostUser.username);
      }

      // Check current route before navigating
      const currentRoute = app.router ? app.router.getCurrentRoute() : 'unknown';
      console.log('[LocalPlayer] Current route:', currentRoute);

      // Navigate to play-config if not already there
      if (app.router) {
        if (currentRoute !== 'play-config') {
          console.log('[LocalPlayer] Navigating to play-config...');
          app.router.navigate('play-config');
          console.log('[LocalPlayer] Navigation complete');
        } else {
          console.log('[LocalPlayer] Already on play-config, no navigation needed');
        }
      } else {
        console.warn('[LocalPlayer] No router available!');
      }

      // Update the party display to show the new player with highlighting
      console.log('[LocalPlayer] Scheduling updateGamePartyDisplay in 50ms...');
      setTimeout(() => {
        console.log('[LocalPlayer] Executing updateGamePartyDisplay...');

        // CRITICAL: Re-verify host user before updating display (double check)
        if (savedHostUser) {
          console.log('[LocalPlayer] Double-checking host user before display update');
          authManager.currentUser = savedHostUser;

          // Ensure all host name elements are correct
          const hostPlayerNames = [
            document.getElementById('host-player-name'),           // Arcade mode
            document.getElementById('host-player-name-coop'),      // Coop mode
            document.getElementById('host-player-name-tournament') // Tournament mode
          ];

          hostPlayerNames.forEach(element => {
            if (element) {
              element.textContent = savedHostUser.username;
              console.log('[LocalPlayer] Re-verified host name in element:', element.id);
            }
          });
        }

        app.updateGamePartyDisplay();
        console.log('[LocalPlayer] ✅ Party display updated with new player');
      }, 50);

    } catch (err) {
      console.error('❌ [LocalPlayer] Exception during login:', err);
      error!.textContent = 'An error occurred during login: ' + (err as Error).message;
      error!.style.display = 'block';
      isSubmittingLogin = false;
    }
  });

  // Forgot password link
  const forgotPasswordLink = document.getElementById('local-player-forgot-password-link');
  console.log('[LocalPlayer] Setup - Forgot Password Link:', forgotPasswordLink ? '✅ Found' : '❌ Not found');

  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async (e) => {
      e.preventDefault();
      console.log('[LocalPlayer] Forgot password clicked');

      const emailInput = document.getElementById('local-player-login-email') as HTMLInputElement;
      console.log('[LocalPlayer] Email input element:', emailInput ? '✅ Found' : '❌ Not found');

      const email = emailInput?.value.trim();
      console.log('[LocalPlayer] Email value:', email || '(empty)');

      if (!email) {
        console.log('[LocalPlayer] No email provided, showing error toast');
        if ((window as any).showToast) {
          (window as any).showToast('Please enter your email address first', 'error');
        } else {
          console.warn('[LocalPlayer] showToast function not available');
          alert('Please enter your email address first');
        }
        return;
      }

      const authManager = (window as any).authManager;
      console.log('[LocalPlayer] AuthManager:', authManager ? '✅ Available' : '❌ Not available');

      if (!authManager) {
        console.error('[LocalPlayer] AuthManager not available!');
        if ((window as any).showToast) {
          (window as any).showToast('Auth system not available', 'error');
        } else {
          alert('Auth system not available');
        }
        return;
      }

      console.log('[LocalPlayer] Sending password reset for:', email);

      try {
        const result = await authManager.forgotPassword(email);
        console.log('[LocalPlayer] Forgot password result:', result);

        if (result.success) {
          if ((window as any).showToast) {
            (window as any).showToast('Password reset link sent! Please check your email.', 'success');
          } else {
            alert('Password reset link sent! Please check your email.');
          }
          console.log('✅ [LocalPlayer] Password reset email sent');
        } else {
          const errorMsg = 'Failed to send reset email: ' + (result.error || 'Unknown error');
          if ((window as any).showToast) {
            (window as any).showToast(errorMsg, 'error');
          } else {
            alert(errorMsg);
          }
          console.error('❌ [LocalPlayer] Password reset failed:', result.error);
        }
      } catch (error) {
        console.error('❌ [LocalPlayer] Exception during forgot password:', error);
        const errorMsg = 'An error occurred: ' + (error as Error).message;
        if ((window as any).showToast) {
          (window as any).showToast(errorMsg, 'error');
        } else {
          alert(errorMsg);
        }
      }
    });
  } else {
    console.warn('⚠️ [LocalPlayer] Forgot password link not found in DOM');
  }

  // Create account link
  const createAccountLink = document.getElementById('local-player-create-account-link');
  console.log('[LocalPlayer] Setup - Create Account Link:', createAccountLink ? '✅ Found' : '❌ Not found');

  if (createAccountLink) {
    createAccountLink.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('[LocalPlayer] Create account link clicked');
      hideLocalPlayerLoginModal();
      showLocalPlayerRegisterModal();
    });
  } else {
    console.warn('⚠️ [LocalPlayer] Create account link not found in DOM');
  }

  // Close button (X)
  document.getElementById('close-local-player-login-modal')?.addEventListener('click', () => {
    console.log('[LocalPlayer] Login modal closed via X button');
    hideLocalPlayerLoginModal();
  });

  // Modal overlay click to close
  loginModal?.querySelector('.modal-overlay')?.addEventListener('click', () => {
    console.log('[LocalPlayer] Login modal closed via overlay click');
    hideLocalPlayerLoginModal();
  });
}
// Register a new local player, update the player list, and preserve highlights
export async function registerAndHighlightLocalPlayer(app: any, username: string, email: string, password: string): Promise<void> {
  const error = document.getElementById('local-player-register-error') as HTMLElement;
  const modal = document.getElementById('local-player-register-modal') as HTMLElement;
  if (!username || !email || !password) {
    error!.textContent = 'Please fill in all fields.';
    error!.style.display = 'block';
    return;
  }
  if (password.length < 6) {
    error!.textContent = 'Password must be at least 6 characters.';
    error!.style.display = 'block';
    return;
  }
  const authManager = (window as any).authManager;
  if (!authManager) {
    error!.textContent = 'Auth system not available.';
    error!.style.display = 'block';
    return;
  }
  const result = await authManager.register(username, email, password);
  if (result.success && result.data) {
    // DO NOT update host session or token
    if (!app.localPlayers) app.localPlayers = [];
    app.localPlayers.push({
      id: result.data.userId.toString(),
      username: result.data.username,
      isCurrentUser: false,
      userId: result.data.userId,
      token: result.data.token || ''
    });
    app.updateLocalPlayersDisplay();
    modal.style.display = 'none';
    // Preserve highlighted players
    const prevActiveIds: string[] = [];
    const partyList = document.getElementById('game-party-list');
    if (partyList) {
      partyList.querySelectorAll('.player-card.active').forEach(card => {
        const id = (card as HTMLElement).dataset.playerId;
        if (id) prevActiveIds.push(id);
      });
    }
    setTimeout(() => {
      app.router.navigate('play-config');
      app.updateGamePartyDisplay();
      // Restore highlights
      setTimeout(() => {
        const partyList = document.getElementById('game-party-list');
        if (partyList) {
          partyList.querySelectorAll('.player-card').forEach(card => {
            const id = (card as HTMLElement).dataset.playerId;
            if (id && prevActiveIds.includes(id)) {
              card.classList.add('active');
            }
          });
          // Highlight the newly added local player
          const playerCards = partyList.querySelectorAll('.player-card.local-player');
          if (playerCards.length > 0) {
            const lastPlayerCard = playerCards[playerCards.length - 1] as HTMLElement;
            lastPlayerCard.classList.add('active');
          }
        }
      }, 100);
    }, 100);
  } else {
    error!.textContent = result.error || 'Registration failed.';
    error!.style.display = 'block';
  }
}
// Local player add/register logic and modal
import { LocalPlayer, AuthResult } from './types';

export async function registerLocalPlayer(username: string, email: string, password: string, authManager: any): Promise<AuthResult> {
  return await authManager.register(username, email, password);
}

export function addLocalPlayerToList(localPlayers: LocalPlayer[], user: any, token: string): LocalPlayer[] {
  localPlayers.push({
    id: user.userId.toString(),
    username: user.username,
    isCurrentUser: false,
    userId: user.userId,
    token: token || ''
  });
  return localPlayers;
}

export function setupLocalPlayerRegisterModal(app: any) {
  console.log('🔧 [LocalPlayer] setupLocalPlayerRegisterModal() called');

  // Prevent duplicate initialization
  if (registerModalInitialized) {
    console.log('[LocalPlayer] Register modal already initialized, skipping');
    return;
  }

  const modal = document.getElementById('local-player-register-modal') as HTMLElement;
  const form = document.getElementById('local-player-register-form') as HTMLFormElement;
  const error = document.getElementById('local-player-register-error') as HTMLElement;

  console.log('[LocalPlayer] Setup - Modal:', modal ? '✅ Found' : '❌ Not found');
  console.log('[LocalPlayer] Setup - Form:', form ? '✅ Found' : '❌ Not found');

  if (!form) {
    console.warn('⚠️ [LocalPlayer] Register form not found, cannot setup');
    return;
  }

  // Mark as initialized before adding listeners
  registerModalInitialized = true;
  console.log('[LocalPlayer] Register modal marked as initialized');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Prevent double submission
    if (isSubmittingRegister) {
      console.warn('⚠️ [LocalPlayer] Registration already in progress, ignoring duplicate submit');
      return;
    }

    isSubmittingRegister = true;
    console.log('📝 [LocalPlayer] Register form submitted, isSubmittingRegister set to true');

    const usernameInput = document.getElementById('local-player-register-username') as HTMLInputElement;
    const emailInput = document.getElementById('local-player-register-email') as HTMLInputElement;
    const passwordInput = document.getElementById('local-player-register-password') as HTMLInputElement;
    const username = usernameInput?.value.trim();
    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    console.log('[LocalPlayer] Register attempt - Username:', username, 'Email:', email, 'Password:', password ? '***' : 'empty');

    if (!username || !email || !password) {
      error!.textContent = 'Please fill in all fields.';
      error!.style.display = 'block';
      console.warn('⚠️ [LocalPlayer] Missing required fields');
      isSubmittingRegister = false;  // Reset guard
      return;
    }
    if (password.length < 6) {
      error!.textContent = 'Password must be at least 6 characters.';
      error!.style.display = 'block';
      console.warn('⚠️ [LocalPlayer] Password too short');
      isSubmittingRegister = false;  // Reset guard
      return;
    }

    // Enhanced duplicate check: host player and all local players (by email/username and userId)
    const hostUser = (window as any).authManager?.getCurrentUser();
    const hostEmail = hostUser?.email;
    const hostUsername = hostUser?.username;
    const hostUserId = hostUser?.userId?.toString();

    console.log('[LocalPlayer] Duplicate check - Host:', { email: hostEmail, username: hostUsername, userId: hostUserId });
    console.log('[LocalPlayer] Duplicate check - Input email:', email, 'username:', username);

    let duplicate = false;
    let duplicateReason = '';

    // Check against host player (email or username match)
    if ((hostEmail && hostEmail === email) || (hostUsername && hostUsername === username)) {
      duplicate = true;
      duplicateReason = 'Host player is already using this email or username';
    }

    // Check against local players array
    if (!duplicate && app.localPlayers) {
      app.localPlayers.forEach((player: any) => {
        if (player.email === email) {
          duplicate = true;
          duplicateReason = `Email already used by ${player.username}`;
        }
        if (player.username === username) {
          duplicate = true;
          duplicateReason = `Username already taken by another player`;
        }
      });
    }

    // Also check DOM elements as backup (in case localPlayers array is out of sync)
    if (!duplicate) {
      const team1List = document.getElementById('team1-list');
      const team2List = document.getElementById('team2-list');

      if (team1List) {
        team1List.querySelectorAll('.player-card.local-player').forEach(card => {
          const cardEmail = (card as HTMLElement).dataset.email;
          if (cardEmail && cardEmail === email) {
            duplicate = true;
            duplicateReason = 'This email is already in TEAM 1';
          }
        });
      }
      if (team2List) {
        team2List.querySelectorAll('.player-card.local-player').forEach(card => {
          const cardEmail = (card as HTMLElement).dataset.email;
          if (cardEmail && cardEmail === email) {
            duplicate = true;
            duplicateReason = 'This email is already in TEAM 2';
          }
        });
      }
    }

    if (duplicate) {
      error!.textContent = duplicateReason || 'This player is already added.';
      error!.style.display = 'block';
      console.warn('⚠️ [LocalPlayer] Duplicate detected:', duplicateReason);
      isSubmittingRegister = false;  // Reset guard
      return;
    }

    const authManager = (window as any).authManager;
    if (!authManager) {
      error!.textContent = 'Auth system not available.';
      error!.style.display = 'block';
      console.error('❌ [LocalPlayer] AuthManager not available');
      isSubmittingRegister = false;  // Reset guard
      return;
    }

    console.log('[LocalPlayer] Attempting registration...');

    // Save the host's token AND currentUser before registering local player
    const hostToken = localStorage.getItem('token');
    const savedHostUser = authManager.getCurrentUser();
    console.log('[LocalPlayer] Saved host token and user for restoration:', savedHostUser);

    try {
      const result = await authManager.register(username, email, password);
      console.log('[LocalPlayer] Registration result:', result.success ? '✅ Success' : '❌ Failed', result);
      console.log('[LocalPlayer] result.success:', result.success);
      console.log('[LocalPlayer] result.data:', result.data);
      console.log('[LocalPlayer] Checking condition: result.success && result.data =', result.success && result.data);

      // CRITICAL: Restore the host's token AND currentUser immediately after local player registration
      if (hostToken) {
        localStorage.setItem('token', hostToken);
        console.log('[LocalPlayer] ✅ Restored host token to localStorage');
      }
      if (savedHostUser && authManager.setCurrentUser) {
        authManager.currentUser = savedHostUser;
        console.log('[LocalPlayer] ✅ Restored host currentUser:', savedHostUser.username);

        // CRITICAL: Immediately update all host player name elements in the DOM
        // to ensure they display the correct host username, not the local player's
        const hostPlayerNames = [
          document.getElementById('host-player-name'),           // Arcade mode
          document.getElementById('host-player-name-coop'),      // Coop mode
          document.getElementById('host-player-name-tournament') // Tournament mode
        ];

        hostPlayerNames.forEach(element => {
          if (element) {
            element.textContent = savedHostUser.username;
            console.log('[LocalPlayer] ✅ Restored host name in element:', element.id);
          }
        });
      }

      if (result.success && result.data) {
        console.log('[LocalPlayer] ✅ Entered register success block!');
        if (!app.localPlayers) app.localPlayers = [];

        // Add to correct team (can be 1, 2, or 'tournament')
        let addPlayerTeam: number | string = 1;
        if ((window as any).addPlayerTeam !== undefined) {
          addPlayerTeam = (window as any).addPlayerTeam;
        }

        // If adding from tournament mode, randomly assign to team 1 or 2 for arcade compatibility
        if (addPlayerTeam === 'tournament') {
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
          console.log('[LocalPlayer] Tournament player (registration) assigned to team', addPlayerTeam,
            '(Team 1:', team1Count, '| Team 2:', team2Count, ')');
        }

        console.log('[LocalPlayer] Creating player object for registration...');
        console.log('[LocalPlayer] Full result.data structure:', JSON.stringify(result.data, null, 2));

        // Extract user data from nested structure (result.data.data for registration)
        const userData = result.data.data || result.data.user || result.data;
        console.log('[LocalPlayer] Extracted userData:', userData);

        if (!userData || !userData.userId) {
          throw new Error('User data is missing userId. Please check the response structure.');
        }

        const playerObj = {
          id: userData.userId.toString(),
          username: userData.username,
          isCurrentUser: false,
          userId: userData.userId,
          token: result.data.token || '',
          email: userData.email || email,
          team: addPlayerTeam  // Store which team this player belongs to
        }; console.log('[LocalPlayer] Adding new player to TEAM', addPlayerTeam, '- Player:', playerObj);

        // Add player to localPlayers array
        app.localPlayers.push(playerObj);

        // Mark player as selected (highlighted)
        const playerId = playerObj.id;
        if (!app.selectedPlayerIds) app.selectedPlayerIds = new Set();
        app.selectedPlayerIds.add(playerId);
        console.log('[LocalPlayer] Player marked as selected:', playerId);

        // Reset submitting guard before closing modal
        isSubmittingRegister = false;
        console.log('[LocalPlayer] Register submitting guard reset');

        // Close modal - use hideLocalPlayerRegisterModal for consistency
        hideLocalPlayerRegisterModal();
        console.log('🎉 [LocalPlayer] Registration successful, modal hidden via hideLocalPlayerRegisterModal()');

        // CRITICAL: Ensure host user is restored BEFORE any navigation or display updates
        console.log('[LocalPlayer] Final host user restoration before navigation/updates (registration)');
        if (savedHostUser) {
          authManager.currentUser = savedHostUser;
          console.log('[LocalPlayer] Host currentUser restored to:', savedHostUser.username);
        }

        // Check current route before navigating
        const currentRoute = app.router ? app.router.getCurrentRoute() : 'unknown';
        console.log('[LocalPlayer] Current route:', currentRoute);

        // Navigate to play-config if not already there
        if (app.router) {
          if (currentRoute !== 'play-config') {
            console.log('[LocalPlayer] Navigating to play-config...');
            app.router.navigate('play-config');
            console.log('[LocalPlayer] Navigation complete');
          } else {
            console.log('[LocalPlayer] Already on play-config, no navigation needed');
          }
        } else {
          console.warn('[LocalPlayer] No router available!');
        }

        // Update the party display to show the new player with highlighting
        console.log('[LocalPlayer] Scheduling updateGamePartyDisplay in 50ms...');
        setTimeout(() => {
          console.log('[LocalPlayer] Executing updateGamePartyDisplay...');

          // CRITICAL: Re-verify host user before updating display (double check)
          if (savedHostUser) {
            console.log('[LocalPlayer] Double-checking host user before display update (registration)');
            authManager.currentUser = savedHostUser;

            // Ensure all host name elements are correct
            const hostPlayerNames = [
              document.getElementById('host-player-name'),           // Arcade mode
              document.getElementById('host-player-name-coop'),      // Coop mode
              document.getElementById('host-player-name-tournament') // Tournament mode
            ];

            hostPlayerNames.forEach(element => {
              if (element) {
                element.textContent = savedHostUser.username;
                console.log('[LocalPlayer] Re-verified host name in element:', element.id, '(registration)');
              }
            });
          }

          app.updateGamePartyDisplay();
          console.log('[LocalPlayer] ✅ Party display updated with new player');
        }, 50);
      } else {
        error!.textContent = result.error || 'Registration failed.';
        error!.style.display = 'block';
        console.error('❌ [LocalPlayer] Registration failed:', result.error);
        isSubmittingRegister = false;  // Reset guard on error
      }
    } catch (err) {
      console.error('❌ [LocalPlayer] Exception during registration:', err);
      error!.textContent = 'An error occurred during registration: ' + (err as Error).message;
      error!.style.display = 'block';
      isSubmittingRegister = false;
    }
  });

  // Close button (X)
  document.getElementById('close-local-player-register-modal')?.addEventListener('click', () => {
    console.log('[LocalPlayer] Register modal closed via X button');
    hideLocalPlayerRegisterModal();
  });


  // Back to login link
  const backToLoginLink = document.getElementById('local-player-back-to-login-link');
  console.log('[LocalPlayer] Setup - Back to Login Link:', backToLoginLink ? '✅ Found' : '❌ Not found');

  if (backToLoginLink) {
    backToLoginLink.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('[LocalPlayer] Back to login clicked');
      hideLocalPlayerRegisterModal();
      showLocalPlayerLoginModal();
    });
  } else {
    console.warn('⚠️ [LocalPlayer] Back to login link not found in DOM');
  }

  // Modal overlay click to close
  modal?.querySelector('.modal-overlay')?.addEventListener('click', () => {
    console.log('[LocalPlayer] Register modal closed via overlay click');
    hideLocalPlayerRegisterModal();
  });
}

function showLocalPlayerLoginModal() {
  console.log('🔓 [LocalPlayer] showLocalPlayerLoginModal() called');

  // Reset the submitting guard when modal opens
  isSubmittingLogin = false;
  console.log('[LocalPlayer] Login submitting guard reset to false');

  const modal = document.getElementById('local-player-login-modal') as HTMLElement;
  const form = document.getElementById('local-player-login-form') as HTMLFormElement;
  const error = document.getElementById('local-player-login-error') as HTMLElement;

  console.log('[LocalPlayer] Modal element:', modal ? '✅ Found' : '❌ Not found');
  console.log('[LocalPlayer] Form element:', form ? '✅ Found' : '❌ Not found');
  console.log('[LocalPlayer] Error element:', error ? '✅ Found' : '❌ Not found');
  console.log('[LocalPlayer] Current addPlayerTeam:', (window as any).addPlayerTeam);

  if (modal) {
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
    console.log('[LocalPlayer] Modal display set to flex (centered)');
  }
  if (error) {
    error.style.display = 'none';
    error.textContent = '';
  }
  if (form) form.reset();
}

function hideLocalPlayerLoginModal() {
  console.log('🔒 [LocalPlayer] hideLocalPlayerLoginModal() called');
  const modal = document.getElementById('local-player-login-modal') as HTMLElement;
  console.log('[LocalPlayer] Modal element found:', modal ? '✅ Yes' : '❌ No');
  if (modal) {
    console.log('[LocalPlayer] Current modal display style:', modal.style.display);
    modal.style.display = 'none';
    modal.classList.add('hidden');
    console.log('[LocalPlayer] Modal display set to: none, hidden class added');
    console.log('[LocalPlayer] Verified modal display:', modal.style.display);
    console.log('[LocalPlayer] Verified modal classList:', modal.classList.toString());
  } else {
    console.error('[LocalPlayer] ❌ Cannot hide modal - element not found!');
  }
}

function showLocalPlayerRegisterModal() {
  console.log('🔓 [LocalPlayer] showLocalPlayerRegisterModal() called');

  // Reset the submitting guard when modal opens
  isSubmittingRegister = false;
  console.log('[LocalPlayer] Register submitting guard reset to false');

  const modal = document.getElementById('local-player-register-modal') as HTMLElement;
  const form = document.getElementById('local-player-register-form') as HTMLFormElement;
  const error = document.getElementById('local-player-register-error') as HTMLElement;
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
  }
  if (error) {
    error.style.display = 'none';
    error.textContent = '';
  }
  if (form) form.reset();
}

function hideLocalPlayerRegisterModal() {
  console.log('🔒 [LocalPlayer] hideLocalPlayerRegisterModal() called');
  const modal = document.getElementById('local-player-register-modal') as HTMLElement;
  console.log('[LocalPlayer] Modal element found:', modal ? '✅ Yes' : '❌ No');
  if (modal) {
    console.log('[LocalPlayer] Current modal display style:', modal.style.display);
    modal.style.display = 'none';
    modal.classList.add('hidden');
    console.log('[LocalPlayer] Modal display set to: none, hidden class added');
    console.log('[LocalPlayer] Verified modal display:', modal.style.display);
    console.log('[LocalPlayer] Verified modal classList:', modal.classList.toString());
  } else {
    console.error('[LocalPlayer] ❌ Cannot hide modal - element not found!');
  }
}

// Export them
export { showLocalPlayerLoginModal, hideLocalPlayerLoginModal, showLocalPlayerRegisterModal, hideLocalPlayerRegisterModal };

// Event delegation for local player list
export function setupLocalPlayerListDelegation() {
  const container = document.getElementById('local-players-list');
  if (!container) return;
  container.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const removeBtn = target.closest('.remove-player-btn') as HTMLElement;
    if (removeBtn) {
      const playerId = removeBtn.getAttribute('data-player-id');
      if (playerId && (window as any).app) {
        (window as any).app.removeLocalPlayer(playerId);
      }
      return;
    }
    // Add more event handling as needed
  });
}
