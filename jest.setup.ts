import '@testing-library/jest-dom';

// -----------------------------------------------------------------------------
// Global Mocks
// -----------------------------------------------------------------------------

// Mock modules that use import.meta.glob or other unsupported syntax
jest.mock('@/controllers/display/utils/statefulIcons', () => ({
  statefulIconTextById: {},
}));

// Mock the simple Vigenère cipher crypto utility for tests
jest.mock('@/utils/crypto', () => ({
  encryptData: jest.fn((text: string) => `encrypted_${text}`),
  decryptData: jest.fn((text: string) => text.replace('encrypted_', '')),
}));

// -----------------------------------------------------------------------------
// 3. Console Warning Suppression
// -----------------------------------------------------------------------------

// Suppress React 18 act() warnings for async state updates
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('An update to') &&
      args[0].includes('inside a test was not wrapped in act')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
