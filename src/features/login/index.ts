/**
 * Login Feature - Public API
 *
 * This is the ONLY file other features should import from.
 * All internal implementation is private.
 */

// Main component
export { LoginPage } from './LoginPage';

// Hooks (if needed by other features)
export { useAuth, useServerProbe } from './hooks';

// Types (if needed by other features)
export type {
  ActivityStatus,
  LoginCredentials,
  AuthState,
} from './types/auth.types';
