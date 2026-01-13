/**
 * User Feature - Public API
 *
 * This is the ONLY file other features should import from.
 * All internal implementation is private.
 */

// Main component
export { default as UserProfile } from './UserProfile';

// Subcomponents (exported for use in navigation/other features)
export { default as AccessLevelSelector } from './components/AccessLevelSelector';
export { default as ConnectionTimer } from './components/ConnectionTimer';

// Types
export type {
  ConnectionTimerProps,
  AccessLevelSelectorProps,
} from './types/user.types';
