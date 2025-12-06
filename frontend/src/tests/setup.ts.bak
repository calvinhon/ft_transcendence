import 'jest-environment-jsdom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  // Keep log and warn for debugging, but silence info and debug
  info: jest.fn(),
  debug: jest.fn(),
};

// Setup global mocks for window objects used in the app
Object.defineProperty(window, 'showToast', {
  writable: true,
  value: jest.fn(),
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});