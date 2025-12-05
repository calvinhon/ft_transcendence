// frontend/src/tests/unit/AppEventManager.test.ts
import { AppEventManager } from '../../managers/app/app-event-manager';
import { logger } from '../../utils/Logger';

// Mock logger
jest.mock('../../utils/Logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('app-event-manager', () => {
  let eventManager: AppEventManager;
  let mockApp: any;
  let mockRouter: any;

  beforeEach(() => {
    eventManager = new AppEventManager();

    // Mock DOM elements
    const mockCreateAccountLink = {
      addEventListener: jest.fn(),
      click: jest.fn()
    };

    const mockForgotPasswordLink = {
      addEventListener: jest.fn(),
      click: jest.fn()
    };

    const mockBackToLoginLink = {
      addEventListener: jest.fn(),
      click: jest.fn()
    };

    const mockBackToLoginFromForgotLink = {
      addEventListener: jest.fn(),
      click: jest.fn()
    };

    const mockLoginForm = {
      addEventListener: jest.fn(),
      submit: jest.fn()
    };

    const mockRegisterForm = {
      addEventListener: jest.fn(),
      submit: jest.fn()
    };

    const mockForgotPasswordForm = {
      addEventListener: jest.fn(),
      submit: jest.fn()
    };

    // Mock document.getElementById
    document.getElementById = jest.fn()
      .mockImplementation((id: string) => {
        switch (id) {
          case 'create-account-link':
            return mockCreateAccountLink;
          case 'forgot-password-link':
            return mockForgotPasswordLink;
          case 'back-to-login-link':
            return mockBackToLoginLink;
          case 'back-to-login-from-forgot-link':
            return mockBackToLoginFromForgotLink;
          case 'login-form':
            return mockLoginForm;
          case 'register-form':
            return mockRegisterForm;
          case 'forgot-password-form':
            return mockForgotPasswordForm;
          case 'login-username':
            return { value: 'testuser' };
          case 'login-password':
            return { value: 'testpass' };
          case 'register-username':
            return { value: 'testuser' };
          case 'register-email':
            return { value: 'test@example.com' };
          case 'register-password':
            return { value: 'testpass' };
          case 'forgot-password-email':
            return { value: 'test@example.com' };
          default:
            return null;
        }
      });

    // Mock window.app
    mockRouter = {
      navigate: jest.fn()
    };

    mockApp = {
      router: mockRouter,
      handleLogin: jest.fn(),
      handleRegisterUser: jest.fn(),
      handleForgotPasswordEmail: jest.fn()
    };

    (window as any).app = mockApp;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize correctly', () => {
    expect(eventManager).toBeDefined();
  });

  test('should setup form event listeners', () => {
    eventManager.initialize(mockApp);

    // Check that logger.info was called for setting up listeners
    expect(logger.info).toHaveBeenCalledWith('app-event-manager', 'Setting up form and navigation event listeners');

    // Check that event listeners were added to elements
    expect(logger.info).toHaveBeenCalledWith('app-event-manager', 'Adding event listener for create-account-link');
    expect(logger.info).toHaveBeenCalledWith('app-event-manager', 'Adding event listener for forgot-password-link');
    expect(logger.info).toHaveBeenCalledWith('app-event-manager', 'Adding event listener for back-to-login-link');
    expect(logger.info).toHaveBeenCalledWith('app-event-manager', 'Adding event listener for back-to-login-from-forgot-link');
  });

  test('should handle create account link click', () => {
    eventManager.initialize(mockApp);

    // Get the mock element
    const createAccountLink = document.getElementById('create-account-link');
    expect(createAccountLink).toBeDefined();

    // Trigger the click event
    const clickHandler = (createAccountLink as any).addEventListener.mock.calls.find(
      (call: any) => call[0] === 'click'
    )[1];

    const mockEvent = { preventDefault: jest.fn() };
    clickHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith('register');
    expect(logger.info).toHaveBeenCalledWith('app-event-manager', 'Create account link clicked');
  });

  test('should handle forgot password link click', () => {
    eventManager.initialize(mockApp);

    const forgotPasswordLink = document.getElementById('forgot-password-link');
    expect(forgotPasswordLink).toBeDefined();

    const clickHandler = (forgotPasswordLink as any).addEventListener.mock.calls.find(
      (call: any) => call[0] === 'click'
    )[1];

    const mockEvent = { preventDefault: jest.fn() };
    clickHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith('forgot-password');
    expect(logger.info).toHaveBeenCalledWith('app-event-manager', 'Forgot password link clicked');
  });

  test('should handle back to login link click', () => {
    eventManager.initialize(mockApp);

    const backToLoginLink = document.getElementById('back-to-login-link');
    expect(backToLoginLink).toBeDefined();

    const clickHandler = (backToLoginLink as any).addEventListener.mock.calls.find(
      (call: any) => call[0] === 'click'
    )[1];

    const mockEvent = { preventDefault: jest.fn() };
    clickHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith('login');
    expect(logger.info).toHaveBeenCalledWith('app-event-manager', 'Back to login link clicked');
  });

  test('should handle back to login from forgot link click', () => {
    eventManager.initialize(mockApp);

    const backToLoginFromForgotLink = document.getElementById('back-to-login-from-forgot-link');
    expect(backToLoginFromForgotLink).toBeDefined();

    const clickHandler = (backToLoginFromForgotLink as any).addEventListener.mock.calls.find(
      (call: any) => call[0] === 'click'
    )[1];

    const mockEvent = { preventDefault: jest.fn() };
    clickHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith('login');
    expect(logger.info).toHaveBeenCalledWith('app-event-manager', 'Back to login from forgot link clicked');
  });

  test('should handle login form submit', () => {
    eventManager.initialize(mockApp);

    const loginForm = document.getElementById('login-form');
    expect(loginForm).toBeDefined();

    const submitHandler = (loginForm as any).addEventListener.mock.calls.find(
      (call: any) => call[0] === 'submit'
    )[1];

    const mockEvent = { preventDefault: jest.fn() };
    submitHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockApp.handleLogin).toHaveBeenCalledWith('testuser', 'testpass');
  });

  test('should handle register form submit', () => {
    eventManager.initialize(mockApp);

    const registerForm = document.getElementById('register-form');
    expect(registerForm).toBeDefined();

    const submitHandler = (registerForm as any).addEventListener.mock.calls.find(
      (call: any) => call[0] === 'submit'
    )[1];

    const mockEvent = { preventDefault: jest.fn() };
    submitHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockApp.handleRegisterUser).toHaveBeenCalledWith('testuser', 'test@example.com', 'testpass');
  });

  test('should handle forgot password form submit', () => {
    eventManager.initialize(mockApp);

    const forgotPasswordForm = document.getElementById('forgot-password-form');
    expect(forgotPasswordForm).toBeDefined();

    const submitHandler = (forgotPasswordForm as any).addEventListener.mock.calls.find(
      (call: any) => call[0] === 'submit'
    )[1];

    const mockEvent = { preventDefault: jest.fn() };
    submitHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockApp.handleForgotPasswordEmail).toHaveBeenCalledWith('test@example.com');
  });

  test('should warn when elements are not found', () => {
    // Mock getElementById to return null for some elements
    document.getElementById = jest.fn().mockReturnValue(null);

    eventManager.initialize(mockApp);

    expect(logger.warn).toHaveBeenCalledWith('app-event-manager', 'create-account-link not found');
    expect(logger.warn).toHaveBeenCalledWith('app-event-manager', 'forgot-password-link not found');
    expect(logger.warn).toHaveBeenCalledWith('app-event-manager', 'back-to-login-link not found');
    expect(logger.warn).toHaveBeenCalledWith('app-event-manager', 'back-to-login-from-forgot-link not found');
  });

  test('should handle missing app or router', () => {
    (window as any).app = null;

    eventManager.initialize(mockApp);

    const createAccountLink = document.getElementById('create-account-link');
    const clickHandler = (createAccountLink as any).addEventListener.mock.calls.find(
      (call: any) => call[0] === 'click'
    )[1];

    const mockEvent = { preventDefault: jest.fn() };
    clickHandler(mockEvent);

    expect(logger.error).toHaveBeenCalledWith('app-event-manager', 'App or router not available');
  });
});