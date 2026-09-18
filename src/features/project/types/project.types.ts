/**
 * Project Feature - Type Definitions
 */

import { ProjectModel } from '@/karabo/common/project/api';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import { RecentSceneInfo } from '@/store/api';

export interface ProjectSceneSelection {
  domain: string;
  projectUuid: string;
  sceneUuid: string;
}

export interface RootProjectLoadHandle {
  controller: AbortController;
  promise: Promise<void>;
  abort: () => void;
}

// Main component props
export type LoadProjectSceneProps = {
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?:
    'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
};

export type SelectProjectSceneDialogProps = {
  open: boolean;
  onSceneSelected: (
    domain: string,
    project: ProjectModel,
    scene: SceneModel
  ) => void;
  onCancel: () => void;
};

// Component props
export type DomainSelectorProps = {
  domains: string[];
  selectedDomain: string;
  onDomainChange: (domain: string) => void;
  disabled?: boolean;
};

export type ProjectsTableProps = {
  projects: ProjectModel[];
  selectedProject?: ProjectModel;
  onProjectClick: (project: ProjectModel) => void;
  query?: string;
  onQueryChange?: (q: string) => void;
  // Blocks selection while a request is in flight. Filtering stays available:
  // it is local to the loaded list and touches no request.
  selectionDisabled?: boolean;
};

export type ScenesTableProps = {
  scenes: SceneModel[];
  selectedScene?: SceneModel;
  onSceneClick: (scene: SceneModel) => void;
  onSceneDoubleClick: (scene: SceneModel) => void;
  query?: string;
  onQueryChange?: (q: string) => void;
  selectionDisabled?: boolean;
};

export type RecentSceneItemProps = {
  scene: RecentSceneInfo;
  onOpen: (scene: RecentSceneInfo) => void;
  onRemove: (scene: RecentSceneInfo) => void;
  disabled?: boolean;
};

export type RecentScenesListProps = {
  scenes: RecentSceneInfo[];
  onSceneOpen: (scene: RecentSceneInfo) => void;
  onSceneRemove: (scene: RecentSceneInfo) => void;
  disabled?: boolean;
};
