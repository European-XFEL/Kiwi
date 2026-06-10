/**
 * Project Feature - Type Definitions
 */

import { ProjectModel, ProjectSceneInfo } from '@/karabo/common/project/api';
import { RecentSceneInfo } from '@/store/api';

// Main component props
export type LoadProjectSceneProps = {
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
};

export type SceneBreadcrumbProps = {
  domain: string;
  projectName: string;
  sceneName: string;
  className?: string;
};

export type SelectProjectSceneDialogProps = {
  open: boolean;
  onSceneSelected: (scene: ProjectSceneInfo) => void;
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
};

export type ScenesTableProps = {
  scenes: ProjectSceneInfo[];
  selectedScene?: ProjectSceneInfo;
  onSceneClick: (scene: ProjectSceneInfo) => void;
  onSceneDoubleClick: (scene: ProjectSceneInfo) => void;
  query?: string;
  onQueryChange?: (q: string) => void;
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
