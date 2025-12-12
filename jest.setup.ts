import '@testing-library/jest-dom';

// Suppress React 18 act() warnings for async state updates
// These warnings occur when components update state asynchronously (e.g., after promise resolution)
// which is expected behavior for loading data, and our tests properly wait for these updates
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
