/**
 * Project Feature - Public API
 *
 * This is the ONLY file other features should import from.
 * All internal implementation is private.
 */

// Main components
export { default as LoadProjectScene } from './LoadProjectScene';
export { default as ProjectBrowser } from './components/ProjectBrowser';
export { default as SelectProjectSceneDialog } from './SelectProjectSceneDialog';

// Browser controller
export { useRootProject } from './hooks/useRootProject';

// Search utilities
export { useDeferredSearch } from './hooks/useDeferredSearch';
export { filterByQuery } from './utils/filterByQuery';

// Route / scene-loading helpers
export {
  loadRootProjectScene,
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
  SelectProjectSceneDialogProps,
  DomainSelectorProps,
  ProjectsTableProps,
  ScenesTableProps,
} from './types/project.types';
