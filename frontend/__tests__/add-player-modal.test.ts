/// <reference types="jest" />
import { AddPlayerModal } from '../src/add-player-modal';

describe('AddPlayerModal', () => {
  let modal: AddPlayerModal;
  beforeAll(() => {
    document.body.innerHTML = `
      <div id="add-player-modal" class="modal hidden">
        <div class="modal-overlay" id="add-player-modal-overlay"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3>Add Player</h3>
            <button id="close-add-player-modal" class="modal-close-btn"><i class="fas fa-times"></i></button>
          </div>
          <div class="modal-body">
            <form id="add-player-form" class="add-player-form">
              <div class="form-group">
                <label for="add-player-username">Username</label>
                <input type="text" id="add-player-username" placeholder="Username" required class="login-input" maxlength="32">
              </div>
              <div id="add-player-error" style="color:red;display:none;"></div>
              <div class="form-actions">
                <button type="button" id="cancel-add-player" class="btn-secondary">Cancel</button>
                <button type="submit" class="btn-primary">Add Player</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    modal = new AddPlayerModal();
  });

  it('shows and hides the modal', () => {
    modal.show();
    expect(document.getElementById('add-player-modal')?.classList.contains('hidden')).toBe(false);
    modal.hide();
    expect(document.getElementById('add-player-modal')?.classList.contains('hidden')).toBe(true);
  });

  it('shows error and clears error', () => {
    modal.showError('Test error');
    expect(document.getElementById('add-player-error')?.textContent).toBe('Test error');
    expect(document.getElementById('add-player-error')?.style.display).toBe('block');
    modal.hideError();
    expect(document.getElementById('add-player-error')?.textContent).toBe('');
    expect(document.getElementById('add-player-error')?.style.display).toBe('none');
  });

  it('calls submit handler with username', () => {
    const handler = jest.fn();
    modal.setSubmitHandler(handler);
    (document.getElementById('add-player-username') as HTMLInputElement).value = 'TestUser';
    (document.getElementById('add-player-form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(handler).toHaveBeenCalledWith('TestUser');
  });
});
