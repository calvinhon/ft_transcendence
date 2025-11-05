export function setupLocalPlayerLoginModal(app: any) {
  console.log('🔧 [LocalPlayer] setupLocalPlayerLoginModal() called');
  const loginModal = document.getElementById('local-player-login-modal') as HTMLElement;
  const loginForm = document.getElementById('local-player-login-form') as HTMLFormElement;
  const error = document.getElementById('local-player-login-error') as HTMLElement;
  
  console.log('[LocalPlayer] Setup - Modal:', loginModal ? '✅ Found' : '❌ Not found');
  console.log('[LocalPlayer] Setup - Form:', loginForm ? '✅ Found' : '❌ Not found');
  
  if (!loginForm) {
    console.warn('⚠️ [LocalPlayer] Login form not found, cannot setup');
    return;
  }
  
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('📝 [LocalPlayer] Login form submitted');
    
    const emailInput = document.getElementById('local-player-login-email') as HTMLInputElement;
    const passwordInput = document.getElementById('local-player-login-password') as HTMLInputElement;
    const email = emailInput?.value.trim();
    const password = passwordInput?.value;
    
    console.log('[LocalPlayer] Login attempt - Email:', email, 'Password:', password ? '***' : 'empty');
    
    if (!email || !password) {
      error!.textContent = 'Please fill in all fields.';
      error!.style.display = 'block';
      console.warn('⚠️ [LocalPlayer] Missing email or password');
      return;
    }
    // Duplicate check: host, both teams
    const hostEmail = (window as any).authManager?.getCurrentUser()?.email;
    const team1List = document.getElementById('team1-list');
    const team2List = document.getElementById('team2-list');
    let duplicate = false;
    if (hostEmail && hostEmail === email) duplicate = true;
    if (team1List) {
      team1List.querySelectorAll('.player-card.local-player').forEach(card => {
        if ((card as HTMLElement).dataset.email === email) duplicate = true;
      });
    }
    if (team2List) {
      team2List.querySelectorAll('.player-card.local-player').forEach(card => {
        if ((card as HTMLElement).dataset.email === email) duplicate = true;
      });
    }
    if (duplicate) {
      error!.textContent = 'This email is already used by another player.';
      error!.style.display = 'block';
      console.warn('⚠️ [LocalPlayer] Duplicate email detected:', email);
      return;
    }
    const authManager = (window as any).authManager;
    if (!authManager) {
      error!.textContent = 'Auth system not available.';
      error!.style.display = 'block';
      console.error('❌ [LocalPlayer] AuthManager not available');
      return;
    }
    
    console.log('[LocalPlayer] Attempting authentication...');
    const result = await authManager.login(email, password);
    console.log('[LocalPlayer] Auth result:', result.success ? '✅ Success' : '❌ Failed', result);
    
    if (result.success && result.data) {
      if (!app.localPlayers) app.localPlayers = [];
      // Add to correct team
      const playerObj = {
        id: result.data.userId.toString(),
        username: result.data.username,
        isCurrentUser: false,
        userId: result.data.userId,
        token: result.data.token || '',
        email: result.data.email || email
      };
      let addPlayerTeam = 1;
      if ((window as any).addPlayerTeam) addPlayerTeam = (window as any).addPlayerTeam;
      
      console.log('[LocalPlayer] Adding player to TEAM', addPlayerTeam, '- Player:', playerObj);
      
      if (addPlayerTeam === 1) {
        app.localPlayers.push(playerObj);
        // Update TEAM 1 UI
        const team1List = document.getElementById('team1-list');
        console.log('[LocalPlayer] TEAM 1 list element:', team1List ? '✅ Found' : '❌ Not found');
        if (team1List) {
            const card = document.createElement('div');
            card.className = 'player-card local-player active';
            card.dataset.playerId = playerObj.id;
            card.dataset.email = playerObj.email;
            card.innerHTML = `<div class="player-avatar"><i class="fas fa-user"></i></div><div class="player-info"><span class="player-name">${playerObj.username}</span></div>`;
            // Attach click handler so newly created cards can be toggled
            team1List.appendChild(card);
            console.log('✅ [LocalPlayer] Player card added to TEAM 1');
        }
      } else {
        // TEAM 2
        app.localPlayers.push(playerObj);
        const team2List = document.getElementById('team2-list');
        console.log('[LocalPlayer] TEAM 2 list element:', team2List ? '✅ Found' : '❌ Not found');
        if (team2List) {
            const card = document.createElement('div');
            card.className = 'player-card local-player active';
            card.dataset.playerId = playerObj.id;
            card.dataset.email = playerObj.email;
            card.innerHTML = `<div class="player-avatar"><i class="fas fa-user"></i></div><div class="player-info"><span class="player-name">${playerObj.username}</span></div>`;
            team2List.appendChild(card);
            console.log('✅ [LocalPlayer] Player card added to TEAM 2');
        }
      }
      loginModal.style.display = 'none';
      console.log('🎉 [LocalPlayer] Login successful, modal closed');
      setTimeout(() => {
        app.router.navigate('play-config');
      }, 100);
    } else {
      error!.textContent = result.error || 'Login failed.';
      error!.style.display = 'block';
      console.error('❌ [LocalPlayer] Login failed:', result.error);
    }
  });
  // Forgot password link
  document.getElementById('local-player-forgot-password-link')?.addEventListener('click', async (e) => {
    e.preventDefault();
    console.log('[LocalPlayer] Forgot password clicked');
    const emailInput = document.getElementById('local-player-login-email') as HTMLInputElement;
    const email = emailInput?.value.trim();
    
    if (!email) {
      if ((window as any).showToast) {
        (window as any).showToast('Please enter your email address first', 'error');
      }
      return;
    }
    
    const authManager = (window as any).authManager;
    if (!authManager) {
      if ((window as any).showToast) {
        (window as any).showToast('Auth system not available', 'error');
      }
      return;
    }
    
    console.log('[LocalPlayer] Sending password reset for:', email);
    const result = await authManager.forgotPassword(email);
    
    if (result.success) {
      if ((window as any).showToast) {
        (window as any).showToast('Password reset link sent! Please check your email.', 'success');
      }
      console.log('✅ [LocalPlayer] Password reset email sent');
    } else {
      if ((window as any).showToast) {
        (window as any).showToast('Failed to send reset email: ' + (result.error || 'Unknown error'), 'error');
      }
      console.error('❌ [LocalPlayer] Password reset failed:', result.error);
    }
  });
  
  // Create account link
  document.getElementById('local-player-create-account-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('[LocalPlayer] Create account link clicked');
    hideLocalPlayerLoginModal();
    showLocalPlayerRegisterModal();
  });
  
  // Cancel button
  document.getElementById('cancel-local-player-login')?.addEventListener('click', () => {
    console.log('[LocalPlayer] Login cancelled');
    loginModal.style.display = 'none';
  });
  
  // Close button (X)
  document.getElementById('close-local-player-login-modal')?.addEventListener('click', () => {
    console.log('[LocalPlayer] Login modal closed via X button');
    loginModal.style.display = 'none';
  });
  
  // Modal overlay click to close
  loginModal?.querySelector('.modal-overlay')?.addEventListener('click', () => {
    console.log('[LocalPlayer] Login modal closed via overlay click');
    loginModal.style.display = 'none';
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
  // Track which team is being added to
  let addPlayerTeam = 1;
  if ((window as any).addPlayerTeam) addPlayerTeam = (window as any).addPlayerTeam;
  const modal = document.getElementById('local-player-register-modal') as HTMLElement;
  const form = document.getElementById('local-player-register-form') as HTMLFormElement;
  const error = document.getElementById('local-player-register-error') as HTMLElement;
  
  console.log('[LocalPlayer] Setup - Modal:', modal ? '✅ Found' : '❌ Not found');
  console.log('[LocalPlayer] Setup - Form:', form ? '✅ Found' : '❌ Not found');
  
  if (!form) {
    console.warn('⚠️ [LocalPlayer] Register form not found, cannot setup');
    return;
  }
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('📝 [LocalPlayer] Register form submitted');
    
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
      return;
    }
    if (password.length < 6) {
      error!.textContent = 'Password must be at least 6 characters.';
      error!.style.display = 'block';
      console.warn('⚠️ [LocalPlayer] Password too short');
      return;
    }
    // Duplicate check: host, both teams
    const hostEmail = (window as any).authManager?.getCurrentUser()?.email;
    const team1List = document.getElementById('team1-list');
    const team2List = document.getElementById('team2-list');
    let duplicate = false;
    if (hostEmail && hostEmail === email) duplicate = true;
    if (team1List) {
      team1List.querySelectorAll('.player-card.local-player').forEach(card => {
        if ((card as HTMLElement).dataset.email === email) duplicate = true;
      });
    }
    if (team2List) {
      team2List.querySelectorAll('.player-card.local-player').forEach(card => {
        if ((card as HTMLElement).dataset.email === email) duplicate = true;
      });
    }
    if (duplicate) {
      error!.textContent = 'This email is already used by another player.';
      error!.style.display = 'block';
      console.warn('⚠️ [LocalPlayer] Duplicate email detected:', email);
      return;
    }
    const authManager = (window as any).authManager;
    if (!authManager) {
      error!.textContent = 'Auth system not available.';
      error!.style.display = 'block';
      console.error('❌ [LocalPlayer] AuthManager not available');
      return;
    }
    
    console.log('[LocalPlayer] Attempting registration...');
    const result = await authManager.register(username, email, password);
    console.log('[LocalPlayer] Registration result:', result.success ? '✅ Success' : '❌ Failed', result);
    
    if (result.success && result.data) {
      if (!app.localPlayers) app.localPlayers = [];
      // Add to correct team
      const playerObj = {
        id: result.data.userId.toString(),
        username: result.data.username,
        isCurrentUser: false,
        userId: result.data.userId,
        token: result.data.token || '',
        email: result.data.email || email
      };
      
      console.log('[LocalPlayer] Adding new player to TEAM', addPlayerTeam, '- Player:', playerObj);
      
      if (addPlayerTeam === 1) {
        app.localPlayers.push(playerObj);
        // Update TEAM 1 UI
        const team1List = document.getElementById('team1-list');
        console.log('[LocalPlayer] TEAM 1 list element:', team1List ? '✅ Found' : '❌ Not found');
        if (team1List) {
          const card = document.createElement('div');
          card.className = 'player-card local-player active';
          card.dataset.playerId = playerObj.id;
          card.dataset.email = playerObj.email;
          card.innerHTML = `<div class="player-avatar"><i class="fas fa-user"></i></div><div class="player-info"><span class="player-name">${playerObj.username}</span></div>`;
          team1List.appendChild(card);
          console.log('✅ [LocalPlayer] Player card added to TEAM 1');
        }
      } else {
        // TEAM 2
        app.localPlayers.push(playerObj);
        const team2List = document.getElementById('team2-list');
        console.log('[LocalPlayer] TEAM 2 list element:', team2List ? '✅ Found' : '❌ Not found');
        if (team2List) {
          const card = document.createElement('div');
          card.className = 'player-card local-player active';
          card.dataset.playerId = playerObj.id;
          card.dataset.email = playerObj.email;
          card.innerHTML = `<div class="player-avatar"><i class="fas fa-user"></i></div><div class="player-info"><span class="player-name">${playerObj.username}</span></div>`;
          team2List.appendChild(card);
          console.log('✅ [LocalPlayer] Player card added to TEAM 2');
        }
      }
      modal.style.display = 'none';
      console.log('🎉 [LocalPlayer] Registration successful, modal closed');
      setTimeout(() => {
        app.router.navigate('play-config');
      }, 100);
    } else {
      error!.textContent = result.error || 'Registration failed.';
      error!.style.display = 'block';
      console.error('❌ [LocalPlayer] Registration failed:', result.error);
    }
  });
  
  // Cancel button
  document.getElementById('cancel-local-player-register')?.addEventListener('click', () => {
    console.log('[LocalPlayer] Registration cancelled');
    modal.style.display = 'none';
  });
  
  // Close button (X)
  document.getElementById('close-local-player-register-modal')?.addEventListener('click', () => {
    console.log('[LocalPlayer] Register modal closed via X button');
    modal.style.display = 'none';
  });
  
  // Back to login link
  document.getElementById('local-player-back-to-login-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('[LocalPlayer] Back to login clicked');
    hideLocalPlayerRegisterModal();
    showLocalPlayerLoginModal();
  });
  
  // Modal overlay click to close
  modal?.querySelector('.modal-overlay')?.addEventListener('click', () => {
    console.log('[LocalPlayer] Register modal closed via overlay click');
    modal.style.display = 'none';
  });
}

function showLocalPlayerLoginModal() {
  console.log('🔓 [LocalPlayer] showLocalPlayerLoginModal() called');
  const modal = document.getElementById('local-player-login-modal') as HTMLElement;
  const form = document.getElementById('local-player-login-form') as HTMLFormElement;
  const error = document.getElementById('local-player-login-error') as HTMLElement;
  
  console.log('[LocalPlayer] Modal element:', modal ? '✅ Found' : '❌ Not found');
  console.log('[LocalPlayer] Form element:', form ? '✅ Found' : '❌ Not found');
  console.log('[LocalPlayer] Error element:', error ? '✅ Found' : '❌ Not found');
  console.log('[LocalPlayer] Current addPlayerTeam:', (window as any).addPlayerTeam);
  
  if (modal) {
    modal.style.display = 'block';
    console.log('[LocalPlayer] Modal display set to block');
  }
  if (error) {
    error.style.display = 'none';
    error.textContent = '';
  }
  if (form) form.reset();
}

function hideLocalPlayerLoginModal() {
  const modal = document.getElementById('local-player-login-modal') as HTMLElement;
  if (modal) modal.style.display = 'none';
}

function showLocalPlayerRegisterModal() {
  const modal = document.getElementById('local-player-register-modal') as HTMLElement;
  const form = document.getElementById('local-player-register-form') as HTMLFormElement;
  const error = document.getElementById('local-player-register-error') as HTMLElement;
  if (modal) modal.style.display = 'block';
  if (error) {
    error.style.display = 'none';
    error.textContent = '';
  }
  if (form) form.reset();
}

function hideLocalPlayerRegisterModal() {
  const modal = document.getElementById('local-player-register-modal') as HTMLElement;
  if (modal) modal.style.display = 'none';
}

// Export them
export { showLocalPlayerLoginModal, hideLocalPlayerLoginModal, showLocalPlayerRegisterModal, hideLocalPlayerRegisterModal };

import { qs } from './ui-view';

// Event delegation for local player list
export function setupLocalPlayerListDelegation() {
  const container = qs('#local-players-list');
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
