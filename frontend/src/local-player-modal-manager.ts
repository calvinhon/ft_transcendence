// frontend/src/local-player-modal-manager.ts
// Modal management for local player login/registration

export class LocalPlayerModalManager {
  private loginModalInitialized = false;
  private registerModalInitialized = false;
  private isSubmittingLogin = false;
  private isSubmittingRegister = false;

  constructor() {
    this.initializeModals();
  }

  private initializeModals(): void {
    this.setupLoginModal();
    this.setupRegisterModal();
  }

  private setupLoginModal(): void {
    console.log('🔧 [LocalPlayer] setupLocalPlayerLoginModal() called');

    // Prevent duplicate initialization
    if (this.loginModalInitialized) {
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
    this.loginModalInitialized = true;
    console.log('[LocalPlayer] Login modal marked as initialized');

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Prevent double submission
      if (this.isSubmittingLogin) {
        console.warn('⚠️ [LocalPlayer] Login already in progress, ignoring duplicate submit');
        return;
      }

      this.isSubmittingLogin = true;
      console.log('📝 [LocalPlayer] Login form submitted, isSubmittingLogin set to true');

      const emailInput = document.getElementById('local-player-login-email') as HTMLInputElement;
      const passwordInput = document.getElementById('local-player-login-password') as HTMLInputElement;
      const email = emailInput?.value.trim();
      const password = passwordInput?.value;

      console.log('[LocalPlayer] Login attempt - Email:', email, 'Password:', password ? '***' : 'empty');

      try {
        const result = await this.handleLogin(email, password);

        if (result.success) {
          console.log('✅ [LocalPlayer] Login successful');
          this.hideLoginModal();
          this.showToast('Login successful!', 'success');

          // Reload page or refresh app state
          window.location.reload();
        } else {
          console.warn('❌ [LocalPlayer] Login failed:', result.error);
          if (error) {
            error.textContent = result.error || 'Login failed';
            error.style.display = 'block';
          }
        }
      } catch (err) {
        console.error('💥 [LocalPlayer] Login error:', err);
        if (error) {
          error.textContent = 'An unexpected error occurred';
          error.style.display = 'block';
        }
      } finally {
        this.isSubmittingLogin = false;
        console.log('📝 [LocalPlayer] Login submission completed, isSubmittingLogin reset to false');
      }
    });

    // Close modal handlers
    const closeBtn = document.getElementById('close-local-player-login-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideLoginModal());
    }

    // Modal overlay click to close
    if (loginModal) {
      loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) {
          this.hideLoginModal();
        }
      });
    }

    // Link handlers
    const forgotPasswordLink = document.getElementById('local-player-forgot-password-link');
    if (forgotPasswordLink) {
      forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.hideLoginModal();
        // Show forgot password screen (not implemented yet)
        console.log('Forgot password link clicked - not implemented');
      });
    }

    const createAccountLink = document.getElementById('local-player-create-account-link');
    if (createAccountLink) {
      createAccountLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.hideLoginModal();
        this.showRegisterModal();
      });
    }
  }

  private setupRegisterModal(): void {
    console.log('🔧 [LocalPlayer] setupLocalPlayerRegisterModal() called');

    // Prevent duplicate initialization
    if (this.registerModalInitialized) {
      console.log('[LocalPlayer] Register modal already initialized, skipping');
      return;
    }

    const registerModal = document.getElementById('local-player-register-modal') as HTMLElement;
    const registerForm = document.getElementById('local-player-register-form') as HTMLFormElement;
    const error = document.getElementById('local-player-register-error') as HTMLElement;

    console.log('[LocalPlayer] Setup - Modal:', registerModal ? '✅ Found' : '❌ Not found');
    console.log('[LocalPlayer] Setup - Form:', registerForm ? '✅ Found' : '❌ Not found');

    if (!registerForm) {
      console.warn('⚠️ [LocalPlayer] Register form not found, cannot setup');
      return;
    }

    // Mark as initialized before adding listeners
    this.registerModalInitialized = true;
    console.log('[LocalPlayer] Register modal marked as initialized');

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Prevent double submission
      if (this.isSubmittingRegister) {
        console.warn('⚠️ [LocalPlayer] Register already in progress, ignoring duplicate submit');
        return;
      }

      this.isSubmittingRegister = true;
      console.log('📝 [LocalPlayer] Register form submitted, isSubmittingRegister set to true');

      const usernameInput = document.getElementById('local-player-register-username') as HTMLInputElement;
      const emailInput = document.getElementById('local-player-register-email') as HTMLInputElement;
      const passwordInput = document.getElementById('local-player-register-password') as HTMLInputElement;
      const confirmPasswordInput = document.getElementById('local-player-register-confirm-password') as HTMLInputElement;

      const username = usernameInput?.value.trim();
      const email = emailInput?.value.trim();
      const password = passwordInput?.value;
      const confirmPassword = confirmPasswordInput?.value;

      console.log('[LocalPlayer] Register attempt - Username:', username, 'Email:', email);

      try {
        const result = await this.handleRegister(username, email, password, confirmPassword);

        if (result.success) {
          console.log('✅ [LocalPlayer] Register successful');
          this.hideRegisterModal();
          this.showToast('Registration successful! Please log in.', 'success');

          // Optionally switch to login modal
          setTimeout(() => this.showLoginModal(), 1500);
        } else {
          console.warn('❌ [LocalPlayer] Register failed:', result.error);
          if (error) {
            error.textContent = result.error || 'Registration failed';
            error.style.display = 'block';
          }
        }
      } catch (err) {
        console.error('💥 [LocalPlayer] Register error:', err);
        if (error) {
          error.textContent = 'An unexpected error occurred';
          error.style.display = 'block';
        }
      } finally {
        this.isSubmittingRegister = false;
        console.log('📝 [LocalPlayer] Register submission completed, isSubmittingRegister reset to false');
      }
    });

    // Close modal handlers
    const closeBtn = document.getElementById('close-local-player-register-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideRegisterModal());
    }

    // Modal overlay click to close
    if (registerModal) {
      registerModal.addEventListener('click', (e) => {
        if (e.target === registerModal) {
          this.hideRegisterModal();
        }
      });
    }

    // Link handlers
    const backToLoginLink = document.getElementById('local-player-back-to-login-link');
    if (backToLoginLink) {
      backToLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.hideRegisterModal();
        this.showLoginModal();
      });
    }
  }

  private async handleLogin(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    try {
      const authManager = (window as any).authManager;
      if (!authManager) {
        return { success: false, error: 'Authentication system not available' };
      }

      const result = await authManager.login(email, password);
      return result;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  }

  private async handleRegister(username: string, email: string, password: string, confirmPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!username || !email || !password || !confirmPassword) {
      return { success: false, error: 'All fields are required' };
    }

    if (password !== confirmPassword) {
      return { success: false, error: 'Passwords do not match' };
    }

    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    try {
      const authManager = (window as any).authManager;
      if (!authManager) {
        return { success: false, error: 'Authentication system not available' };
      }

      const result = await authManager.register(username, email, password);
      return result;
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  }

  private showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const toast = (window as any).showToast;
    if (toast) {
      toast(message, type);
    } else {
      console.log(`Toast: ${type.toUpperCase()} - ${message}`);
    }
  }

  // Public modal control methods
  public showLoginModal(): void {
    const modal = document.getElementById('local-player-login-modal');
    if (modal) {
      modal.style.display = 'block';
      // Clear any previous errors
      const error = document.getElementById('local-player-login-error');
      if (error) {
        error.style.display = 'none';
      }
    }
  }

  public hideLoginModal(): void {
    const modal = document.getElementById('local-player-login-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  public showRegisterModal(): void {
    const modal = document.getElementById('local-player-register-modal');
    if (modal) {
      modal.style.display = 'block';
      // Clear any previous errors
      const error = document.getElementById('local-player-register-error');
      if (error) {
        error.style.display = 'none';
      }
    }
  }

  public hideRegisterModal(): void {
    const modal = document.getElementById('local-player-register-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }
}