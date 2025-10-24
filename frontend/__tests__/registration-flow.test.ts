import { registerAndHighlightLocalPlayer } from '../src/local-player';

describe('registerAndHighlightLocalPlayer', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="local-player-register-error"></div>
      <div id="local-player-register-modal"></div>
      <div id="game-party-list"></div>
    `;
    (window as any).authManager = {
      register: jest.fn(async (username, email, password) => ({ success: true, data: { userId: 1, username, token: 'tok' } }))
    };
  });
  it('registers and highlights a local player', async () => {
    await registerAndHighlightLocalPlayer({}, 'user', 'email@email.com', 'password');
    expect(document.getElementById('local-player-register-error')?.textContent).toBe('');
  });
  it('shows error for missing fields', async () => {
    await registerAndHighlightLocalPlayer({}, '', '', '');
    expect(document.getElementById('local-player-register-error')?.textContent).toBe('Please fill in all fields.');
  });
});
