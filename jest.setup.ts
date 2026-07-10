import '@testing-library/jest-dom';

import { TextEncoder, TextDecoder } from 'util';

Object.assign(global, { TextDecoder, TextEncoder });

// -----------------------------------------------------------------------------
// Global Mocks
// -----------------------------------------------------------------------------

// Mock modules that use import.meta.glob or other unsupported syntax
jest.mock('@/features/controllers/api', () => ({
  ...jest.requireActual('@/features/controllers/api'),
  statefulIconModelsById: {},
  bootstrapStatefulIcons: jest.fn(),
}));

// Mock the simple Vigenère cipher crypto utility for tests
jest.mock('@/lib/crypto', () => ({
  encryptData: jest.fn((text: string) => `encrypted_${text}`),
  decryptData: jest.fn((text: string) => text.replace('encrypted_', '')),
}));

// Mock ESM-only react-resizable-panels package for Jest (CJS runtime).
// Mirrors the v4 API surface (Group/Panel/Separator/useDefaultLayout) used by
// resizable.tsx.
jest.mock('react-resizable-panels', () => {
  const React = require('react');

  const passthrough = ({ children, ...props }: any) =>
    React.createElement('div', props, children);

  // Layout props are library-specific, not DOM attributes — drop them so the
  // div passthrough doesn't trigger unknown-prop warnings.
  const group = ({
    defaultLayout,
    onLayoutChange,
    onLayoutChanged,
    ...props
  }: any) => passthrough(props);

  return {
    Group: group,
    Panel: passthrough,
    Separator: passthrough,
    // No persistence in tests: never a stored layout, saves are dropped.
    useDefaultLayout: () => ({
      defaultLayout: undefined,
      onLayoutChange: () => {},
      onLayoutChanged: () => {},
    }),
  };
});

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
