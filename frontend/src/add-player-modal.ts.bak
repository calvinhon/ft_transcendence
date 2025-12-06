// add-player-modal.ts
// Reusable AddPlayerModal component for showing/hiding and handling add player logic

export class AddPlayerModal {
  private modal: HTMLElement;
  private form: HTMLFormElement;
  private error: HTMLElement;
  private onSubmit: ((username: string) => void) | null = null;

  constructor() {
    this.modal = document.getElementById('add-player-modal') as HTMLElement;
    this.form = document.getElementById('add-player-form') as HTMLFormElement;
    this.error = document.getElementById('add-player-error') as HTMLElement;
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const usernameInput = document.getElementById('add-player-username') as HTMLInputElement;
        const username = usernameInput?.value.trim();
        if (!username) {
          this.showError('Please enter a username.');
          return;
        }
        this.hideError();
        if (this.onSubmit) this.onSubmit(username);
      });
    }
    document.getElementById('close-add-player-modal')?.addEventListener('click', () => this.hide());
    document.getElementById('cancel-add-player')?.addEventListener('click', () => this.hide());
    document.getElementById('add-player-modal-overlay')?.addEventListener('click', () => this.hide());
  }

  show() {
    if (this.modal) this.modal.classList.remove('hidden');
    this.hideError();
    if (this.form) this.form.reset();
    const usernameInput = document.getElementById('add-player-username') as HTMLInputElement;
    if (usernameInput) usernameInput.focus();
  }

  hide() {
    if (this.modal) this.modal.classList.add('hidden');
  }

  showError(msg: string) {
    if (this.error) {
      this.error.textContent = msg;
      this.error.style.display = 'block';
    }
  }

  hideError() {
    if (this.error) {
      this.error.textContent = '';
      this.error.style.display = 'none';
    }
  }

  setSubmitHandler(handler: (username: string) => void) {
    this.onSubmit = handler;
  }
}
