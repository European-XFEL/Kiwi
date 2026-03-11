import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/dropdown-menu';
import { ProjectItemInfo, ProjectSceneInfo } from '@/karabo/common/project/api';
import { cn } from '@/components/utils/cn';
import { getDbConn } from '@/lib/singletons/api';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectsTable from './components/ProjectTable';
import ScenesTable from './components/ScenesTable';
import type { SceneBreadcrumbProps } from './types/project.types';

export default function SceneBreadcrumb({
  domain,
  projectName,
  sceneName,
  className,
}: SceneBreadcrumbProps) {
  const navigate = useNavigate();
  const { sessionInfo } = useGlobalStore();

  // Controlled open state for both menus
  const [projectOpen, setProjectOpen] = useState(false);
  const [sceneOpen, setSceneOpen] = useState(false);

  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectItemInfo[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectItemInfo>();

  const [scenesLoading, setScenesLoading] = useState(false);
  const [scenes, setScenes] = useState<ProjectSceneInfo[]>([]);
  const [scenesError, setScenesError] = useState('');
  // undefined = not yet interacted, show route prop
  // null      = project changed, show placeholder
  // string   = scene was selected, show that name
  const [displaySceneName, setDisplaySceneName] = useState<
    string | null | undefined
  >(undefined);

  // Cache: project UUID → scene list. Stable ref, writes don't trigger re-renders.
  const scenesCache = useRef<Map<string, ProjectSceneInfo[]>>(new Map());
  // Track which project UUID is currently being fetched to prevent duplicate requests.
  const loadingForUuid = useRef<string | null>(null);

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
    // Cache hit — reuse immediately, no fetch
    const cached = scenesCache.current.get(project.uuid);
    if (cached) {
      setScenes(cached);
      setScenesError('');
      return;
    }

    // Already fetching for this project — don't start a duplicate request
    if (loadingForUuid.current === project.uuid) return;

    loadingForUuid.current = project.uuid;
    setScenes([]);
    setScenesLoading(true);
    setScenesError('');

    getDbConn().listScenes(
      project.domain,
      project.name,
      project.uuid,
      (scenesInfo) => {
        loadingForUuid.current = null;
        if (scenesInfo.error_msg) {
          setScenesError(scenesInfo.error_msg);
        } else {
          scenesCache.current.set(project.uuid, scenesInfo.scenes);
          setScenes(scenesInfo.scenes);
        }
        setScenesLoading(false);
      }
    );
  };

  const handleProjectClick = (project: ProjectItemInfo) => {
    setSelectedProject(project);
    setDisplaySceneName(null); // project changed — hide stale scene name
    setProjectOpen(false);
    // Kick off scene fetch before opening the menu so it's ready (or loading) immediately
    loadScenes(project);
    setSceneOpen(true);
  };

  const handleSceneDropdownOpen = () => {
    if (!selectedProject) {
      // No prior project selection — resolve from the current route prop
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

  const handleSceneClick = (scene: ProjectSceneInfo) => {
    setDisplaySceneName(scene.name);
    setSceneOpen(false);
    navigate(
      `/scene?host=${sessionInfo!.guiServerHost}&port=${
        sessionInfo!.guiServerPort
      }` +
        `&domain=${encodeURIComponent(scene.domain)}` +
        `&projectName=${encodeURIComponent(scene.projectName)}` +
        `&uuid=${encodeURIComponent(scene.uuid)}`
    );
  };

  const displayProjectName = selectedProject?.name ?? projectName;
  // undefined → show route prop; null → project changed, show placeholder; string → selected scene
  const shownSceneName =
    displaySceneName === undefined
      ? sceneName
      : (displaySceneName ?? 'Select a scene...');

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
            open={projectOpen}
            onOpenChange={(open) => {
              setProjectOpen(open);
              if (open) handleProjectDropdownOpen();
            }}
          >
            <DropdownMenuTrigger asChild>
              <BreadcrumbLink
                className="cursor-pointer font-semibold block truncate max-w-full"
                title={displayProjectName}
              >
                {displayProjectName}
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
            open={sceneOpen}
            onOpenChange={(open) => {
              setSceneOpen(open);
              if (open) handleSceneDropdownOpen();
            }}
          >
            <DropdownMenuTrigger asChild>
              <BreadcrumbLink
                className="cursor-pointer font-semibold block truncate max-w-full"
                title={shownSceneName}
              >
                {shownSceneName}
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
              ) : scenesError ? (
                <div className="p-4 text-sm text-destructive">
                  {scenesError}
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
