/**
 * Project Feature - Public API
 *
 * This is the ONLY file other features should import from.
 * All internal implementation is private.
 */

// Main components
export { default as LoadProjectScene } from './LoadProjectScene';
export { default as ProjectBrowser } from './components/ProjectBrowser';
export { default as SceneBreadcrumb } from './SceneBreadcrumb';
export { default as SelectProjectSceneDialog } from './SelectProjectSceneDialog';

// Subcomponents (for internal use or specific cases)
export { default as RecentScenesList } from './components/RecentScenesList';
export { default as RecentSceneItem } from './components/RecentSceneItem';

// Browser controller
export { useRootProject } from './hooks/useRootProject';

// Search utilities
export { useDeferredSearch } from './hooks/useDeferredSearch';
export { filterByQuery } from './utils/filterByQuery';

// Route / scene-loading helpers
export {
  loadRootProjectFromBookmark,
  clearRootProject,
} from './utils/rootProjectActions';
export {
  openSceneLinkInWorkspace,
  openDeviceSceneLinkInWorkspace,
} from './utils/openSceneLinkInWorkspace';

// Types
export type {
  RootProjectLoadHandle,
  LoadProjectSceneProps,
  SceneBreadcrumbProps,
  SelectProjectSceneDialogProps,
  DomainSelectorProps,
  ProjectsTableProps,
  ScenesTableProps,
  RecentSceneItemProps,
  RecentScenesListProps,
} from './types/project.types';
