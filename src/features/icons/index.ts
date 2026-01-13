/**
 * Icons Feature - Public API
 *
 * Provides stateful icon components and utilities for dynamically
 * colored SVG icons based on device/property states.
 */

// Components
export { default as StatefulIcon } from './components/StatefulIcon';

// Utilities
export { statefulIconTextById } from './utils/statefulIcons';
export {
  recolorPreloadedSvg,
  getPreloadedCacheKey,
  clearRecolorCache,
  getRecolorCacheSize,
  type RecolorOptions,
  type RecolorResult,
} from './utils/loadAndRecolor';
