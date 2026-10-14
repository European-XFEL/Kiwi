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
export { ProjectLoading } from './components/ProjectLoading';
export { default as ProjectFavoritesList } from './components/ProjectFavoritesList';
export type { ProjectFavoritesListProps } from './components/ProjectFavoritesList';
export { useProjectFavorites } from './hooks/useProjectFavorites';

// Browser controller
export { useRootProject } from './hooks/useRootProject';

// Search utilities
export { useDeferredSearch } from './hooks/useDeferredSearch';
export { filterByQuery } from './utils/filterByQuery';

// Route / scene-loading helpers
export {
  addProjectFavorite,
  removeProjectFavorite,
} from './utils/projectFavoriteActions';
export {
  loadRootProject,
  loadRootProjectScene,
  clearRootProject,
} from './utils/rootProjectActions';
export {
  openSceneLinkInWorkspace,
  openDeviceSceneLinkInWorkspace,
  retrieveDefaultDeviceScene,
} from './utils/openSceneLinkInWorkspace';

export {
  openSceneInWorkspace,
  openUnattachedSceneInWorkspace,
} from './utils/openSceneInWorkspace';

// Types
export type {
  RootProjectBrowser,
  RootProjectLoadHandle,
  LoadProjectSceneProps,
  SelectProjectSceneDialogProps,
  DomainSelectorProps,
  ProjectsTableProps,
} from './types/project.types';
