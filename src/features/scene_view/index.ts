/**
 * Scene View Feature - Public API
 *
 * This is the ONLY file other features should import from.
 * All internal implementation is private.
 *
 * The scene_view layer provides:
 * - Scene canvas for rendering Karabo scenes
 * - Scene-specific layouts (BoxLayout, FixedLayout, GridLayout)
 * - Scene status and metadata display components
 * - Widget components for scene elements
 */

// ──────────────────────────────────────────────────────────────────────
// MAIN CANVAS
// ──────────────────────────────────────────────────────────────────────

export { default as SceneCanvas } from './SceneCanvas';

// ──────────────────────────────────────────────────────────────────────
// SCENE LAYOUTS
// ──────────────────────────────────────────────────────────────────────

export { default as BoxLayout } from './layouts/BoxLayout';
export { default as FixedLayout } from './layouts/FixedLayout';
export { default as GridLayout } from './layouts/GridLayout';

// ──────────────────────────────────────────────────────────────────────
// COMPONENTS
// ──────────────────────────────────────────────────────────────────────

export { default as SceneStatus } from './components/SceneStatus';
export { default as SceneSizeDisplay } from './components/SceneSizeDisplay';

// ──────────────────────────────────────────────────────────────────────
// WIDGETS
// ──────────────────────────────────────────────────────────────────────

export { Label } from './widget';
