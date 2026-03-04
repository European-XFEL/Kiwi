// Public API for the scene-view feature.
// External consumers import from '@/features/scene-view', not from deep paths.

export { default as SceneView } from './components/SceneView';
export { default as SceneStatus } from './components/SceneStatus';
export { default as SceneSizeDisplay } from './components/SceneSizeDisplay';
export { default as FitModeSelect } from './components/FitModeSelect';
export { FitModeToolbar } from './components/FitModeToolbar';
export { useSceneLoader } from './hooks/useSceneLoader';
export { useSceneScale } from './hooks/useSceneScale';
export type { FitMode, Dimensions } from './hooks/useSceneScale';
export { registerRenderer, getRenderer } from './render/registry';
export type { Renderer } from './render/registry';
