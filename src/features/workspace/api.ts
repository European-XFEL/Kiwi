export { default as WorkspacePage } from './WorkspacePage';
export { default as WorkspaceShell } from './components/WorkspaceShell';
export { SceneRouteRedirect } from './components/SceneBootstrap';
export { default as useWorkspaceRuntime } from './hooks/useWorkspaceRuntime';
export { createDefaultWorkspaceModel } from './utils';

export type {
  PanelAreaModel,
  PanelAreaOrientation,
  PanelId,
  WorkspaceBodyModel,
  WorkspaceFooterKind,
  WorkspaceFooterModel,
  WorkspaceHeaderDensity,
  WorkspaceHeaderKind,
  WorkspaceHeaderModel,
  WorkspaceId,
  WorkspaceModel,
  WorkspacePanelContent,
  PanelModel,
  PanelSlot,
  WorkspaceRuntime,
} from './types';
