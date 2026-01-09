/**
 * Project Feature - Public API
 *
 * This is the ONLY file other features should import from.
 * All internal implementation is private.
 */

// Main components
export { default as LoadProjectScene } from './LoadProjectScene';
export { default as SceneBreadcrumb } from './SceneBreadcrumb';
export { default as SelectProjectSceneDialog } from './SelectProjectSceneDialog';

// Subcomponents (for internal use or specific cases)
export { default as RecentScenesList } from './components/RecentScenesList';
export { default as RecentSceneItem } from './components/RecentSceneItem';

// Types
export type {
  LoadProjectSceneProps,
  SceneBreadcrumbProps,
  SelectProjectSceneDialogProps,
  DomainSelectorProps,
  ProjectFilterProps,
  ProjectsTableProps,
  ScenesTableProps,
  RecentSceneItemProps,
  RecentScenesListProps,
} from './types/project.types';
