/**
 * Project Feature - Type Definitions
 */

import { ProjectModel } from '@/karabo/common/project/api';
import { SceneModel } from '@/karabo/common/scenemodel/api';
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
  onSceneSelected: (
    domain: string,
    projectName: string,
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
};

export type ScenesTableProps = {
  scenes: SceneModel[];
  selectedScene?: SceneModel;
  onSceneClick: (scene: SceneModel) => void;
  onSceneDoubleClick: (scene: SceneModel) => void;
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
