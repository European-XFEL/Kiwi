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
import { cn } from '@/components/api';
import { getDbConn, getProjectModel } from '@/lib/singletons/api';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ProjectsTable from './components/ProjectTable';
import ScenesTable from './components/ScenesTable';
import { useDeferredSearch } from './hooks/useDeferredSearch';
import { useKaraboEvent, KaraboEvent } from '@/lib/events';
import type { SceneBreadcrumbProps } from './types/project.types';
import { filterByQuery } from './utils/filterByQuery';
import { ProjectModel } from '@/karabo/common/project/api';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import { openSceneInWorkspace } from './utils/openSceneInWorkspace';

type PendingSelection = {
  project: ProjectModel;
  sceneName: string | null;
};

function readProjects(hash: Hash): ProjectModel[] {
  const itemsHashes = hash.getValue('reply.items') as HashValues[];
  const projects = itemsHashes.map((hv: HashValues) => {
    const item = new Hash(hv);
    return new ProjectModel({
      uuid: item.getValue('uuid'),
      date: item.getValue('date'),
      simple_name: item.getValue('simple_name'),
      is_trashed: item.getValue('is_trashed'),
    });
  });

  return projects
    .filter((project) => !project.is_trashed)
    .sort((a, b) => a.simple_name.localeCompare(b.simple_name));
}

// TODO: Derive a breadcrumb tailored for device-provided scenes. For now,
// the user of the breadcrumb (the NavBar), provides empty domains and
// the deviceId as a replacement for the project name for device-provided
// scenes breadcrumbs
export default function SceneBreadcrumb({
  domain,
  projectName,
  sceneName,
  className,
}: SceneBreadcrumbProps) {
  const [projectOpen, setProjectOpen] = useState(false);
  const [sceneOpen, setSceneOpen] = useState(false);
  const projectSearch = useDeferredSearch();
  const sceneSearch = useDeferredSearch();

  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectModel[]>([]);
  const [pendingSelection, setPendingSelection] =
    useState<PendingSelection | null>(null);

  const [scenesLoading, setScenesLoading] = useState(false);
  const [scenes, setScenes] = useState<SceneModel[]>([]);
  const [scenesError, setScenesError] = useState('');

  const loadingProjectRef = useRef<ProjectModel | null>(null);
  const scenesProjectRef = useRef<ProjectModel | null>(null);

  const routeProject = projects.find(
    (project) => project.simple_name === projectName
  );
  const activeProject =
    pendingSelection?.project ?? routeProject ?? getProjectModel().root;

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
    loadingProjectRef.current = null;
    scenesProjectRef.current = null;
    setPendingSelection(null);
    setProjectsLoading(true);
    setProjects([]);
    setScenes([]);
    setScenesLoading(false);
    setScenesError('');
    getDbConn().listProjects(domain);
  }, [domain]);

  useEffect(() => {
    setPendingSelection(null);
  }, [projectName, sceneName]);

  const handleProjectDropdownOpen = () => {
    setProjectsLoading(true);
    getDbConn().listProjects(domain);
  };

  const loadScenes = (project: ProjectModel) => {
    scenesProjectRef.current = project;
    setScenesError('');

    if (project.scenes) {
      setScenes(project.scenes);
      setScenesLoading(false);
      return;
    }

    setScenes([]);
    setScenesLoading(true);

    if (loadingProjectRef.current) {
      return;
    }

    loadingProjectRef.current = project;
    getDbConn().loadProject(domain, project);
  };

  useKaraboEvent(KaraboEvent.ListProjects, (hash: Hash) => {
    const reason = hash.getValue('reason');
    if (reason.length !== 0) {
      setProjectsLoading(false);
      return;
    }

    setProjects(readProjects(hash));
    setProjectsLoading(false);
  });

  useKaraboEvent(KaraboEvent.DatabaseBusy, (hash: Hash) => {
    const loadedProject = loadingProjectRef.current;
    if (!loadedProject) {
      return;
    }

    const isProcessing = hash.getValue('is_processing');
    if (isProcessing) {
      return;
    }

    const targetProject = scenesProjectRef.current;
    loadingProjectRef.current = null;

    if (targetProject && targetProject.uuid !== loadedProject.uuid) {
      loadScenes(targetProject);
      return;
    }

    if (!targetProject) {
      setScenesLoading(false);
      return;
    }

    const loadingFailed = hash.has('loading_failed')
      ? hash.getValue<boolean>('loading_failed')
      : false;
    if (loadingFailed) {
      setScenesError(
        `Could not load scenes for project "${loadedProject.simple_name}".`
      );
      setScenesLoading(false);
      return;
    }

    setScenes(loadedProject.scenes ?? []);
    setScenesError('');
    setScenesLoading(false);
  });

  const handleProjectClick = (project: ProjectModel) => {
    setPendingSelection({ project, sceneName: null });
    sceneSearch.clear();
    setProjectOpen(false);
    loadScenes(project);
    setSceneOpen(true);
  };

  const handleSceneDropdownOpen = () => {
    if (activeProject) {
      loadScenes(activeProject);
    }
  };

  const handleSceneDropdownClose = () => {
    if (pendingSelection?.sceneName === null) {
      setPendingSelection(null);
    }
  };

  const handleSceneClick = (scene: SceneModel) => {
    const sceneProject = scenesProjectRef.current ?? activeProject;
    if (!sceneProject) {
      return;
    }

    setPendingSelection({
      project: sceneProject,
      sceneName: scene.simple_name,
    });
    setSceneOpen(false);

    getProjectModel().setRoot(domain, sceneProject);
    openSceneInWorkspace({ model: scene });
  };

  const displayProjectName =
    pendingSelection?.project.simple_name ?? projectName;
  const shownSceneName = pendingSelection
    ? (pendingSelection.sceneName ?? 'Select a scene...')
    : sceneName;

  return (
    <Breadcrumb className={cn('min-w-0 max-w-full', className)}>
      <BreadcrumbList className="flex-nowrap min-w-0 overflow-hidden">
        <BreadcrumbItem className="shrink-0 max-w-[20%]">
          <BreadcrumbPage className="font-medium truncate">
            {domain}
          </BreadcrumbPage>
        </BreadcrumbItem>

        <BreadcrumbSeparator className="shrink-0" />

        <BreadcrumbItem className="min-w-0 max-w-[40%]">
          <DropdownMenu
            open={projectOpen}
            onOpenChange={(open) => {
              setProjectOpen(open);
              if (open) {
                setSceneOpen(false);
                handleProjectDropdownOpen();
              }
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
                  selectedProject={activeProject}
                  onProjectClick={handleProjectClick}
                  query={projectSearch.query}
                  onQueryChange={projectSearch.setQuery}
                />
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </BreadcrumbItem>

        <BreadcrumbSeparator className="shrink-0" />

        <BreadcrumbItem className="min-w-0 max-w-[40%]">
          <DropdownMenu
            open={sceneOpen}
            onOpenChange={(open) => {
              setSceneOpen(open);
              if (open) {
                setProjectOpen(false);
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
