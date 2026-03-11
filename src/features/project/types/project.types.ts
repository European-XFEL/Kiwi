/**
 * Project Feature - Type Definitions
 */

import * as React from 'react';
import { ProjectItemInfo, ProjectSceneInfo } from '@/karabo/common/project/api';
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

export type ProjectFilterProps = {
  onFilter: () => void;
  onClear: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
};

export type ProjectsTableProps = {
  projects: ProjectItemInfo[];
  selectedProject?: ProjectItemInfo;
  onProjectClick: (project: ProjectItemInfo) => void;
};

export type ScenesTableProps = {
  scenes: ProjectSceneInfo[];
  selectedScene?: ProjectSceneInfo;
  onSceneClick: (scene: ProjectSceneInfo) => void;
  onSceneDoubleClick: (scene: ProjectSceneInfo) => void;
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
