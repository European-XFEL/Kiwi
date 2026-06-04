// Public API for the scene-view feature.
// External consumers import from '@/features/scene-view/api'.

export { registerRenderer, type Renderer } from './renderRegistry';
export {
  containerPointerEvents,
  contentPointerEvents,
  contentsWrapperStyle,
} from './utils/mode';
export type { SceneInteractionMode } from './utils/mode';
export { default as ScenePage } from './components/ScenePage';
export { default as SceneView } from './components/SceneView';
export { default as SceneStatus } from './components/SceneStatus';
export { default as SceneSizeDisplay } from './components/SceneSizeDisplay';
export { default as FitModeSelect } from './components/FitModeSelect';
export { ControllerContainer } from './components/widgets/ControllerContainer';
export { useSceneLoader } from './hooks/useSceneLoader';
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
