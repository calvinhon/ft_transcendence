export function setupLocalPlayerLoginModal(app: any) {
  const loginModal = document.getElementById('local-player-login-modal') as HTMLElement;
  const loginForm = document.getElementById('local-player-login-form') as HTMLFormElement;
  const error = document.getElementById('local-player-login-error') as HTMLElement;
  if (!loginForm) return;
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('local-player-login-email') as HTMLInputElement;
    const passwordInput = document.getElementById('local-player-login-password') as HTMLInputElement;
    const email = emailInput?.value.trim();
    const password = passwordInput?.value;
    if (!email || !password) {
      error!.textContent = 'Please fill in all fields.';
      error!.style.display = 'block';
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
      return;
    }
    const authManager = (window as any).authManager;
    if (!authManager) {
      error!.textContent = 'Auth system not available.';
      error!.style.display = 'block';
      return;
    }
    const result = await authManager.login(email, password);
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
      if (addPlayerTeam === 1) {
        app.localPlayers.push(playerObj);
        // Update TEAM 1 UI
        const team1List = document.getElementById('team1-list');
        if (team1List) {
          const card = document.createElement('div');
          card.className = 'player-card local-player active';
          card.dataset.playerId = playerObj.id;
          card.dataset.email = playerObj.email;
          card.innerHTML = `<div class="player-avatar"><i class="fas fa-user"></i></div><div class="player-info"><span class="player-name">${playerObj.username}</span></div>`;
          team1List.appendChild(card);
        }
      } else {
        // TEAM 2
        app.localPlayers.push(playerObj);
        const team2List = document.getElementById('team2-list');
        if (team2List) {
          const card = document.createElement('div');
          card.className = 'player-card local-player active';
          card.dataset.playerId = playerObj.id;
          card.dataset.email = playerObj.email;
          card.innerHTML = `<div class="player-avatar"><i class="fas fa-user"></i></div><div class="player-info"><span class="player-name">${playerObj.username}</span></div>`;
          team2List.appendChild(card);
        }
      }
      loginModal.style.display = 'none';
      setTimeout(() => {
        app.router.navigate('play-config');
      }, 100);
    } else {
      error!.textContent = result.error || 'Login failed.';
      error!.style.display = 'block';
    }
  });
  // Forgot password link
  document.getElementById('local-player-forgot-password-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    // For now, just show a toast
    if ((window as any).showToast) {
      (window as any).showToast('Forgot password functionality not implemented yet', 'info');
    }
  });
  // Create account link
  document.getElementById('local-player-create-account-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    hideLocalPlayerLoginModal();
    showLocalPlayerRegisterModal();
  });
  document.getElementById('cancel-local-player-login')?.addEventListener('click', () => {
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
  // Track which team is being added to
  let addPlayerTeam = 1;
  if ((window as any).addPlayerTeam) addPlayerTeam = (window as any).addPlayerTeam;
  const modal = document.getElementById('local-player-register-modal') as HTMLElement;
  const form = document.getElementById('local-player-register-form') as HTMLFormElement;
  const error = document.getElementById('local-player-register-error') as HTMLElement;
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const usernameInput = document.getElementById('local-player-register-username') as HTMLInputElement;
    const emailInput = document.getElementById('local-player-register-email') as HTMLInputElement;
    const passwordInput = document.getElementById('local-player-register-password') as HTMLInputElement;
    const username = usernameInput?.value.trim();
    const email = emailInput?.value.trim();
    const password = passwordInput?.value;
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
      if (addPlayerTeam === 1) {
        app.localPlayers.push(playerObj);
        // Update TEAM 1 UI
        const team1List = document.getElementById('team1-list');
        if (team1List) {
          const card = document.createElement('div');
          card.className = 'player-card local-player active';
          card.dataset.playerId = playerObj.id;
          card.dataset.email = playerObj.email;
          card.innerHTML = `<div class="player-avatar"><i class="fas fa-user"></i></div><div class="player-info"><span class="player-name">${playerObj.username}</span></div>`;
          team1List.appendChild(card);
        }
      } else {
        // TEAM 2
        app.localPlayers.push(playerObj);
        const team2List = document.getElementById('team2-list');
        if (team2List) {
          const card = document.createElement('div');
          card.className = 'player-card local-player active';
          card.dataset.playerId = playerObj.id;
          card.dataset.email = playerObj.email;
          card.innerHTML = `<div class="player-avatar"><i class="fas fa-user"></i></div><div class="player-info"><span class="player-name">${playerObj.username}</span></div>`;
          team2List.appendChild(card);
        }
      }
      modal.style.display = 'none';
      setTimeout(() => {
        app.router.navigate('play-config');
      }, 100);
    } else {
      error!.textContent = result.error || 'Registration failed.';
      error!.style.display = 'block';
    }
  });
  document.getElementById('cancel-local-player-register')?.addEventListener('click', () => {
    modal.style.display = 'none';
  });
}

function showLocalPlayerLoginModal() {
  const modal = document.getElementById('local-player-login-modal') as HTMLElement;
  const form = document.getElementById('local-player-login-form') as HTMLFormElement;
  const error = document.getElementById('local-player-login-error') as HTMLElement;
  if (modal) modal.style.display = 'block';
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
