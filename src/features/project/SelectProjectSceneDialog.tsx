import React, { useMemo, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/api';
import { Hash, HashValues } from '@/karabo/data/api';
import { Button } from '@/components/api';
import { Separator } from '@/components/api';
import { getConfig, getDbConn, getNetwork } from '@/lib/singletons/api';
import { ProjectModel } from '@/karabo/common/project/api';
import { useGlobalStore } from '@/store/api';
import DomainSelector from './components/DomainSelector';
import ProjectsTable from './components/ProjectTable';
import ScenesTable from './components/ScenesTable';
import { LoadingStatus } from '@/features/status';
import type { SelectProjectSceneDialogProps } from './types/project.types';
import { useKaraboEvent, KaraboEvent } from '@/lib/events';
import { getDomains } from './utils/getDomains';
import { useDeferredSearch } from './hooks/useDeferredSearch';
import { filterByQuery } from './utils/filterByQuery';
import { SceneModel } from '@/karabo/common/scenemodel/api';

// Below lg the projects and scenes panes are a navigation stack: only one is
// shown and choosing a project slides to its scenes. From lg up both are
// side by side and this is ignored.
type DialogView = 'projects' | 'scenes';

enum ActivityStatus {
  NO_ACTIVITY,
  GETTING_DOMAINS,
  GETTING_PROJECTS,
  GETTING_SCENES,
}

export default function SelectProjectSceneDialog({
  open,
  onSceneSelected,
  onCancel,
}: SelectProjectSceneDialogProps) {
  const { sessionInfo } = useGlobalStore();
  const [activityStatus, setActivityStatus] = useState(
    ActivityStatus.NO_ACTIVITY
  );
  const [errorMsg, setErrorMessage] = useState('');
  const [domains, setDomains] = useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [projects, setProjects] = useState<ProjectModel[]>([]);
  const [selectedProject, setSelectedProject] = useState<
    ProjectModel | undefined
  >(undefined);
  const [scenes, setScenes] = useState<SceneModel[]>([]);
  const [selectedScene, setSelectedScene] = useState<SceneModel | undefined>(
    undefined
  );
  const [view, setView] = useState<DialogView>('projects');
  const domainsInitializedRef = useRef(false);
  const projectsPaneRef = useRef<HTMLElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  // Set when the user navigates, so focus follows them into the pane they
  // opened. A domain change also resets the view but leaves focus alone.
  const moveFocusOnViewChangeRef = useRef(false);

  const projectSearch = useDeferredSearch();
  const sceneSearch = useDeferredSearch();

  // A request is in flight. Selecting anything while one is pending would send
  // a second request whose reply cannot be told apart from the first, so the
  // reply could be applied to whichever row happens to be selected by then.
  const isBusy = activityStatus !== ActivityStatus.NO_ACTIVITY;

  const filteredProjects = useMemo(
    () =>
      filterByQuery(
        projects,
        projectSearch.deferredQuery,
        (project) => project.simple_name
      ),
    [projectSearch.deferredQuery, projects]
  );

  const filteredScenes = useMemo(
    () =>
      filterByQuery(
        scenes,
        sceneSearch.deferredQuery,
        (scene) => scene.simple_name
      ),
    [sceneSearch.deferredQuery, scenes]
  );

  const updateProjects = (domain: string) => {
    setView('projects');
    setErrorMessage('');
    setActivityStatus(ActivityStatus.GETTING_PROJECTS);
    setProjects([]);
    setSelectedProject(undefined);
    setScenes([]);
    setSelectedScene(undefined);
    sceneSearch.clear();
    getDbConn().listProjects(domain);
  };

  const updateScenes = (projectModel: ProjectModel) => {
    setErrorMessage('');
    setActivityStatus(ActivityStatus.GETTING_SCENES);
    setScenes([]);
    setSelectedScene(undefined);
    sceneSearch.clear();
    getNetwork().onListScenes(projectModel.uuid);
  };

  const navigateTo = (next: DialogView) => {
    moveFocusOnViewChangeRef.current = true;
    setView(next);
  };

  const handleProjectClick = (project: ProjectModel) => {
    setSelectedProject(project);
    updateScenes(project);
    navigateTo('scenes');
  };

  // From lg up the back button is display: none, so focusing it does nothing
  // and a desktop click keeps focus where it was.
  React.useEffect(() => {
    if (!moveFocusOnViewChangeRef.current) {
      return;
    }
    moveFocusOnViewChangeRef.current = false;
    if (view === 'scenes') {
      backButtonRef.current?.focus();
    } else {
      // The selected row is disabled while its scenes are still loading, so
      // fall back to the project filter rather than dropping focus.
      const pane = projectsPaneRef.current;
      (
        pane?.querySelector<HTMLElement>(
          'tr[data-selected] button:not(:disabled)'
        ) ?? pane?.querySelector<HTMLElement>('input')
      )?.focus();
    }
  }, [view]);

  const handleSceneClick = (scene: SceneModel) => {
    setSelectedScene(scene);
  };

  const handleSceneDoubleClick = (scene: SceneModel) => {
    setSelectedScene(scene);
    onSceneSelected(selectedDomain, selectedProject!, scene);
  };

  const handleSelectScene = () => {
    if (selectedScene) {
      onSceneSelected(selectedDomain, selectedProject!, selectedScene);
    }
  };

  const getStatusText = () => {
    switch (activityStatus) {
      case ActivityStatus.GETTING_DOMAINS:
        return 'Retrieving domains...';
      case ActivityStatus.GETTING_PROJECTS:
        return 'Retrieving projects...';
      case ActivityStatus.GETTING_SCENES:
        return 'Retrieving scenes...';
      default:
        return '';
    }
  };

  React.useEffect(() => {
    if (!open) {
      // The event handlers below drop replies that arrive while the dialog is
      // closed, so a request still in flight on close leaves its status behind
      // with nothing left to clear it. Reset here, or the next open starts with
      // every row disabled and no way to recover.
      if (isBusy) {
        domainsInitializedRef.current = false;
      }
      setActivityStatus(ActivityStatus.NO_ACTIVITY);
      setErrorMessage('');
      return;
    }
    if (open && !domainsInitializedRef.current) {
      domainsInitializedRef.current = true;
      setActivityStatus(ActivityStatus.GETTING_DOMAINS);
      getDbConn().listDomains();
    }
  }, [isBusy, open]);

  useKaraboEvent(KaraboEvent.ListDomains, (hash: Hash) => {
    if (!open) {
      // Don't handle ListDomains events when closed
      return;
    }
    let domains: string[] = [];
    try {
      domains = getDomains(hash);
    } catch (e) {
      setErrorMessage(
        `Error reading domains: ${e}. Close and reopen the dialog.`
      );
      domainsInitializedRef.current = false;
      setActivityStatus(ActivityStatus.NO_ACTIVITY);
      return;
    }
    domains.sort((a, b) => a.localeCompare(b));
    setDomains(domains);
    if (selectedDomain.length === 0 || !domains.includes(selectedDomain)) {
      const storedDomain = getConfig().currentDomain;
      const currentTopic = sessionInfo?.guiServerTopic as string;
      const startupDomain = domains.includes(currentTopic)
        ? currentTopic
        : domains.includes(storedDomain)
          ? storedDomain
          : domains[0];
      setSelectedDomain(startupDomain);
      getConfig().currentDomain = startupDomain;
      updateProjects(startupDomain);
    } else {
      updateProjects(selectedDomain);
    }
  });

  useKaraboEvent(KaraboEvent.ListProjects, (hash: Hash) => {
    if (!open) {
      // Don't handle ListProjects events when closed
      return;
    }
    const reason = hash.getValue('reason');
    if (reason.length > 0) {
      setErrorMessage(reason);
      setProjects([]);
      setSelectedProject(undefined);
      setScenes([]);
      setSelectedScene(undefined);
      setActivityStatus(ActivityStatus.NO_ACTIVITY);
      return;
    }

    // Projects were retrieved successfully
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
    if (nonTrashedSorted.length === 0) {
      setSelectedProject(undefined);
      setActivityStatus(ActivityStatus.NO_ACTIVITY);
      return;
    }

    const selProject = nonTrashedSorted[0];
    setSelectedProject(selProject);
    // Stays busy: updateScenes starts fetching this project's scenes, and
    // selecting another project before that reply lands would send a second
    // request indistinguishable from it.
    updateScenes(selProject);
  });

  useKaraboEvent(KaraboEvent.ListScenes, (hash: Hash) => {
    if (!open) {
      // Don't handle ListScenes events when closed
      return;
    }
    const reason = hash.getValue('reason');
    if (reason.length > 0) {
      setErrorMessage(reason);
      setScenes([]);
      setSelectedScene(undefined);
    } else {
      // Project Scenes were retrieved successfully
      const itemsHashes = hash.getValue('reply.items') as HashValues[];
      const scenes: SceneModel[] = itemsHashes.map((hv: HashValues) => {
        const sceneItem = new Hash(hv);
        return new SceneModel({
          uuid: sceneItem.getValue('uuid'),
          date: sceneItem.getValue('date'),
          simple_name: sceneItem.getValue('simple_name'),
        });
      });
      const scenesSorted = scenes.sort((a, b) =>
        a.simple_name.localeCompare(b.simple_name)
      );
      setScenes(scenesSorted);
      setSelectedScene(scenesSorted[0]);
    }
    setActivityStatus(ActivityStatus.NO_ACTIVITY);
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent
        data-testid="select-project-scene-dialog"
        className="w-[95vw] sm:w-[92vw] sm:max-w-3xl lg:w-[85vw] lg:max-w-7xl max-h-[90dvh] gap-3 overflow-hidden p-4 sm:gap-4 sm:p-6 flex flex-col"
      >
        <DialogHeader>
          <DialogTitle>Load Project Scene</DialogTitle>
          <DialogDescription>
            Select a domain, project, and scene to load
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto pr-2">
          <div className="overflow-hidden lg:overflow-visible">
            <div
              className={`flex w-[200%] transition-transform duration-300 ease-out motion-reduce:transition-none lg:grid lg:w-full lg:translate-x-0 lg:grid-cols-2 lg:gap-4 ${
                view === 'scenes' ? '-translate-x-1/2' : ''
              }`}
            >
              {/* Projects pane: flattened into the grid from lg up so the
                  domain selector can span both columns */}
              <section
                ref={projectsPaneRef}
                aria-label="Projects"
                className={`w-1/2 min-w-0 space-y-4 px-1 transition-[visibility] duration-300 lg:contents lg:space-y-0 ${
                  view === 'scenes' ? 'invisible lg:visible' : ''
                }`}
              >
                <div className="lg:col-span-2">
                  <DomainSelector
                    domains={domains}
                    selectedDomain={selectedDomain}
                    onDomainChange={(domain) => {
                      setSelectedDomain(domain);
                      getConfig().currentDomain = domain;
                      updateProjects(domain);
                    }}
                    disabled={isBusy}
                  />
                </div>

                <div className="min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="min-w-0 truncate text-sm font-semibold">
                      Projects on Domain "{selectedDomain}"
                    </h3>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      (
                      {filteredProjects.length === projects.length
                        ? projects.length
                        : `${filteredProjects.length} of ${projects.length}`}
                      )
                    </span>
                  </div>
                  <ProjectsTable
                    projects={filteredProjects}
                    selectedProject={selectedProject}
                    onProjectClick={handleProjectClick}
                    query={projectSearch.query}
                    onQueryChange={projectSearch.setQuery}
                    selectionDisabled={isBusy}
                  />
                </div>
              </section>

              {/* Scenes pane */}
              <section
                aria-label="Scenes"
                className={`w-1/2 min-w-0 space-y-2 px-1 transition-[visibility] duration-300 lg:w-auto ${
                  view === 'projects' ? 'invisible lg:visible' : ''
                }`}
              >
                <Button
                  ref={backButtonRef}
                  variant="ghost"
                  size="sm"
                  data-testid="project-scene-back"
                  onClick={() => navigateTo('projects')}
                  className="-ml-2 gap-1 text-muted-foreground lg:hidden"
                >
                  <ChevronLeft className="size-4" />
                  Projects
                </Button>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="min-w-0 truncate text-sm font-semibold">
                    Scenes on Project "{selectedProject?.simple_name ?? ''}"
                  </h3>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    (
                    {filteredScenes.length === scenes.length
                      ? scenes.length
                      : `${filteredScenes.length} of ${scenes.length}`}
                    )
                  </span>
                </div>
                <ScenesTable
                  scenes={filteredScenes}
                  selectedScene={selectedScene}
                  onSceneClick={handleSceneClick}
                  onSceneDoubleClick={handleSceneDoubleClick}
                  query={sceneSearch.query}
                  onQueryChange={sceneSearch.setQuery}
                  selectionDisabled={isBusy}
                />
              </section>
            </div>
          </div>
        </div>

        <Separator />

        <DialogFooter className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <LoadingStatus
            isLoading={isBusy}
            loadingText={getStatusText()}
            error={errorMsg}
          />
          <div className="flex gap-2 sm:ml-auto">
            <Button
              variant="outline"
              data-testid="project-scene-cancel"
              onClick={onCancel}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            {/* Below lg the scene selection is off screen on the projects
                pane: tapping a project is the way forward, and opening from
                here would load a scene the user has not seen */}
            <Button
              data-testid="project-scene-open"
              onClick={handleSelectScene}
              disabled={!selectedScene}
              className={`flex-1 sm:min-w-[140px] sm:flex-none ${
                view === 'projects' ? 'hidden lg:inline-flex' : ''
              }`}
            >
              Open Scene
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
