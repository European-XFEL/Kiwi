// Public API for the scene-view feature.
// External consumers import from '@/features/scene-view/api'.

export {
  registerRenderer,
  type Renderer,
  type RendererProps,
} from './renderRegistry';
export {
  SceneControllerRegistryProvider,
  type SceneControllerRegistry,
  type SceneControllerRegistryProviderProps,
  type SceneControllerRecord,
} from './contexts/SceneControllerRegistryContext';
export { useSceneControllerRegistry } from './hooks/useSceneControllerRegistry';
export {
  containerPointerEvents,
  contentPointerEvents,
  contentsWrapperStyle,
} from './utils/mode';
export type { SceneInteractionMode } from './utils/mode';
export { default as LandingPage } from './components/LandingPage';
export { default as SceneView } from './components/SceneView';
export { default as SceneStatus } from './components/SceneStatus';
export { default as SceneSizeDisplay } from './components/SceneSizeDisplay';
export { default as FitModeSelect } from './components/FitModeSelect';
export { ControllerContainer } from './components/widgets/ControllerContainer';
export { useActiveScene, useActiveSceneStore } from './hooks/useActiveScene';
export { useSceneScale } from './hooks/useSceneScale';
export { getOverflow } from './utils/sceneLayout';
export {
  KaraboSceneWidget,
  renderContent,
  renderLayerContent,
} from './KaraboSceneWidget';
export {
  collectSceneLayers,
  createRootVisitContext,
  getChildVisitContext,
  isVisibleInLayer,
  visitSceneLayers,
  visitSceneTree,
  type SceneLayerContext,
  type SceneLayerEntry,
  type SceneTreeVisitor,
  type SceneVisitContext,
} from './utils/visitor';
export { getChildObjectId } from './utils/objectId';
export {
  isControllerWidget,
  isLayout,
  isShape,
} from './utils/sceneNodePredicates';
export type { SceneViewProps } from './components/SceneView';
export type {
  ControllerContainerContext,
  ControllerContainerProps,
} from './components/widgets/ControllerContainer';
export type { FitMode, Dimensions } from './hooks/useSceneScale';
export type { SceneLayer } from './bounds';
