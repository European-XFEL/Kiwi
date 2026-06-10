import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/api';
import { Hash, HashValues } from '@/karabo/data/api';
import { ProjectSceneInfo } from '@/karabo/common/project/api';
import { cn } from '@/components/api';
import { getDbConn } from '@/lib/singletons/api';
import { useGlobalStore } from '@/store/api';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectsTable from './components/ProjectTable';
import ScenesTable from './components/ScenesTable';
import { useDeferredSearch } from './hooks/useDeferredSearch';
import { useKaraboEvent, KaraboEvent } from '@/lib/events';
import type { SceneBreadcrumbProps } from './types/project.types';
import { filterByQuery } from './utils/filterByQuery';
import { ProjectModel } from '@/karabo/common/project/ProjectModel';

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
  const projectSearch = useDeferredSearch();
  const sceneSearch = useDeferredSearch();

  const projectsInitializedRef = useRef(false);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectModel[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectModel>();

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

  const filteredProjects = filterByQuery(
    projects,
    projectSearch.deferredQuery,
    (project) => project.simple_name
  );

  const filteredScenes = filterByQuery(
    scenes,
    sceneSearch.deferredQuery,
    (scene) => scene.simple_name
  );

  useEffect(() => {
    // Load the domains project at initialization time to avoid
    // the extra time when the user goes directly to the scene
    // selection in the breadcrumb.
    if (!projectsInitializedRef.current) {
      projectsInitializedRef.current = true;
      setProjectsLoading(true);
      // Selected project will be updated once the list of projects is retrieved
      getDbConn().listProjects(domain);
    } else {
      // As the project list has already been loaded,
      // immediately sync the selected project
      const selected = projects?.find((p) => p.simple_name == projectName);
      if (selected) {
        setSelectedProject(selected);
      }
      // and the displaySceneName
      if (displaySceneName !== sceneName) {
        setDisplaySceneName(sceneName);
      }
    }
  }, [domain, projectName, sceneName]);

  const handleProjectDropdownOpen = () => {
    setProjectsLoading(true);
    getDbConn().listProjects(domain);
  };

  useKaraboEvent(KaraboEvent.ListProjects, (hash: Hash) => {
    const reason = hash.getValue('reason');
    if (reason.length == 0) {
      // Project retrieval was successful
      const itemsHashes = hash.getValue('reply.items') as HashValues[];
      const projects: ProjectModel[] = itemsHashes.map((hv: HashValues) => {
        const item = new Hash(hv);
        return new ProjectModel({
          uuid: item.getValue('uuid'),
          date: item.getValue('date'),
          simple_name: item.getValue('simple_name'),
          is_trashed: item.getValue('is_trashed'),
        });
      });
      const nonTrashed = projects.filter((pInf) => !pInf.is_trashed);
      const nonTrashedSorted = nonTrashed.sort((a, b) =>
        a.simple_name.localeCompare(b.simple_name)
      );
      setProjects(nonTrashedSorted);
      if (!selectedProject) {
        const selected = projects.find((p) => p.simple_name == projectName);
        if (selected) {
          setSelectedProject(selected);
        }
      }
      setProjectsLoading(false);
    }
  });

  const loadScenes = (project: ProjectModel) => {
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
      domain,
      project.simple_name,
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

  const handleProjectClick = (project: ProjectModel) => {
    setSelectedProject(project);
    setDisplaySceneName(null); // project changed — hide stale scene name
    sceneSearch.clear();
    setProjectOpen(false);
    // Kick off scene fetch before opening the menu so it's ready (or loading) immediately
    loadScenes(project);
    setSceneOpen(true);
  };

  const handleSceneDropdownOpen = () => {
    if (selectedProject) {
      loadScenes(selectedProject);
    }
  };

  const handleSceneDropdownClose = () => {
    if (!displaySceneName) {
      // The scene selection dropdown was closed without any scene being
      // selected. Have to synchronize the breadcrumb with the scene being
      // displayed
      const project = projects?.find((p) => p.simple_name === projectName);
      if (project) {
        setSelectedProject(project);
      }
      setDisplaySceneName(sceneName);
    }
  };

  const handleSceneClick = (scene: ProjectSceneInfo) => {
    setDisplaySceneName(scene.simple_name);
    setSceneOpen(false);
    navigate(
      `/scene?host=${sessionInfo!.guiServerHost}&port=${
        sessionInfo!.guiServerPort
      }` +
        `&domain=${encodeURIComponent(scene.domain)}` +
        `&projectName=${encodeURIComponent(scene.project_name)}` +
        `&uuid=${encodeURIComponent(scene.uuid)}`
    );
  };

  const displayProjectName = selectedProject?.simple_name ?? projectName;
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
                  projects={filteredProjects}
                  selectedProject={selectedProject}
                  onProjectClick={handleProjectClick}
                  query={projectSearch.query}
                  onQueryChange={projectSearch.setQuery}
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
              if (open) {
                handleSceneDropdownOpen();
              } else {
                handleSceneDropdownClose();
              }
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
                  scenes={filteredScenes}
                  onSceneClick={handleSceneClick}
                  onSceneDoubleClick={handleSceneClick}
                  query={sceneSearch.query}
                  onQueryChange={sceneSearch.setQuery}
                />
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
