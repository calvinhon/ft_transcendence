// frontend/src/add-player-modal.ts
// Modal for adding local players to teams/tournaments

export class AddPlayerModal {
  private modal: HTMLElement | null = null;
  private form: HTMLFormElement | null = null;
  private input: HTMLInputElement | null = null;
  private error: HTMLElement | null = null;
  private submitHandler: ((username: string) => void) | null = null;

  constructor() {
    console.log('🎮 [AddPlayerModal] Constructor called');
    this.initializeModal();
    this.setupEventListeners();
    console.log('🎮 [AddPlayerModal] Constructor completed');
  }

  private initializeModal(): void {
    console.log('🎮 [AddPlayerModal] Initializing modal...');

    // Get references to existing modal elements
    this.modal = document.getElementById('add-player-modal');
    this.form = document.getElementById('add-player-form') as HTMLFormElement;
    this.input = document.getElementById('add-player-username') as HTMLInputElement;
    this.error = document.getElementById('add-player-error');

    console.log('🎮 [AddPlayerModal] Modal elements found:', {
      modal: !!this.modal,
      form: !!this.form,
      input: !!this.input,
      error: !!this.error
    });
  }

  private setupEventListeners(): void {
    if (!this.form || !this.modal) return;

    // Form submission
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Close modal handlers
    const closeBtn = document.getElementById('close-add-player-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Modal overlay click to close
    const overlay = document.getElementById('add-player-modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => this.hide());
    }

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && this.modal.style.display !== 'none') {
        this.hide();
      }
    });
  }

  private handleSubmit(): void {
    if (!this.input || !this.error || !this.submitHandler) return;

    const username = this.input.value.trim();

    // Validation
    if (!username) {
      this.showError('Player name is required');
      return;
    }

    if (username.length < 2) {
      this.showError('Player name must be at least 2 characters');
      return;
    }

    if (username.length > 20) {
      this.showError('Player name must be less than 20 characters');
      return;
    }

    // Check for invalid characters
    const invalidChars = /[<>"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(username)) {
      this.showError('Player name contains invalid characters');
      return;
    }

    // Call the submit handler
    this.submitHandler(username);
  }

  private showError(message: string): void {
    if (this.error) {
      this.error.textContent = message;
      this.error.style.display = 'block';
    }
  }

  public setSubmitHandler(handler: (username: string) => void): void {
    this.submitHandler = handler;
  }

  public show(): void {
    if (this.modal && this.input && this.error) {
      this.modal.classList.remove('hidden');
      this.modal.style.display = 'block';
      this.input.value = '';
      this.error.style.display = 'none';
      this.input.focus();
    }
  }

  public hide(): void {
    if (this.modal) {
      this.modal.classList.add('hidden');
      this.modal.style.display = 'none';
    }
  }
}

// Make it globally available
(window as any).AddPlayerModal = AddPlayerModal;
