import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { getDbConn } from '@/singletons/api';
import { ProjectItemInfo, ProjectSceneInfo } from '@/karabo_data/ProjectDbInfo';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { ProjectSceneCache } from '@/store/ProjectSceneCache';
import ProjectsTable from './components/ProjectTable';
import ScenesTable from './components/ScenesTable';
import { cn } from '@/shared/utils/cn';
import type { SceneBreadcrumbProps } from './types/project.types';

export default function SceneBreadcrumb({
  domain,
  projectName,
  sceneName,
  className,
}: SceneBreadcrumbProps) {
  const navigate = useNavigate();
  const { sessionInfo } = useGlobalStore();

  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectItemInfo[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectItemInfo>();

  const [scenesLoading, setScenesLoading] = useState(false);
  const [scenes, setScenes] = useState<ProjectSceneInfo[]>([]);

  const handleProjectDropdownOpen = () => {
    setProjectsLoading(true);
    getDbConn().listProjects(domain, (projectsInfo) => {
      if (!projectsInfo.error_msg) {
        setProjects(projectsInfo.projects.filter((p) => !p.isTrashed));
      }
      setProjectsLoading(false);
    });
  };

  const loadScenes = (project: ProjectItemInfo) => {
    setScenesLoading(true);
    getDbConn().listScenes(
      project.domain,
      project.name,
      project.uuid,
      (scenesInfo) => {
        if (!scenesInfo.error_msg) setScenes(scenesInfo.scenes);
        setScenesLoading(false);
      }
    );
  };

  const handleSceneDropdownOpen = () => {
    if (!selectedProject) {
      setProjectsLoading(true);
      getDbConn().listProjects(domain, (projectsInfo) => {
        if (!projectsInfo.error_msg) {
          const current = projectsInfo.projects.find(
            (p) => p.name === projectName
          );
          if (current) {
            setSelectedProject(current);
            loadScenes(current);
          }
        }
        setProjectsLoading(false);
      });
    } else {
      loadScenes(selectedProject);
    }
  };

  const handleProjectClick = (project: ProjectItemInfo) => {
    setSelectedProject(project);
    loadScenes(project);
  };

  const handleSceneClick = (scene: ProjectSceneInfo) => {
    ProjectSceneCache.inst.storeSceneInfo(scene);
    navigate(
      `/scene?host=${sessionInfo!.guiServerHost}&port=${
        sessionInfo!.guiServerPort
      }` +
        `&domain=${encodeURIComponent(scene.domain)}` +
        `&projectName=${encodeURIComponent(scene.projectName)}` +
        `&uuid=${encodeURIComponent(scene.uuid)}`
    );
  };

  return (
    <Breadcrumb className={cn('min-w-0 max-w-full', className)}>
      <BreadcrumbList className="flex-nowrap min-w-0 overflow-hidden">
        {/* Domain */}
        <BreadcrumbItem className="shrink-0 max-w-[20%]">
          <BreadcrumbPage className="font-medium truncate">
            {domain}
          </BreadcrumbPage>
        </BreadcrumbItem>

        <BreadcrumbSeparator className="shrink-0" />

        {/* Project (dropdown) */}
        <BreadcrumbItem className="min-w-0 max-w-[40%]">
          <DropdownMenu
            onOpenChange={(open) => open && handleProjectDropdownOpen()}
          >
            <DropdownMenuTrigger asChild>
              <BreadcrumbLink
                className="cursor-pointer font-semibold block truncate max-w-full"
                title={projectName}
              >
                {projectName}
              </BreadcrumbLink>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[90vw] max-w-[560px] p-2"
              align="start"
              sideOffset={8}
            >
              {projectsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ProjectsTable
                  projects={projects}
                  selectedProject={selectedProject}
                  onProjectClick={handleProjectClick}
                />
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </BreadcrumbItem>

        <BreadcrumbSeparator className="shrink-0" />

        {/* Scene (dropdown) */}
        <BreadcrumbItem className="min-w-0 max-w-[40%]">
          <DropdownMenu
            onOpenChange={(open) => open && handleSceneDropdownOpen()}
          >
            <DropdownMenuTrigger asChild>
              <BreadcrumbLink
                className="cursor-pointer font-semibold block truncate max-w-full"
                title={sceneName}
              >
                {sceneName}
              </BreadcrumbLink>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[90vw] max-w-[560px] p-2"
              align="start"
              sideOffset={8}
            >
              {scenesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScenesTable
                  scenes={scenes}
                  onSceneClick={handleSceneClick}
                  onSceneDoubleClick={handleSceneClick}
                />
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
