import React, { useMemo, useRef, useState } from 'react';
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
  const domainsInitializedRef = useRef(false);

  const projectSearch = useDeferredSearch();
  const sceneSearch = useDeferredSearch();

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
    setActivityStatus(ActivityStatus.GETTING_PROJECTS);
    setScenes([]);
    setSelectedScene(undefined);
    sceneSearch.clear();
    getDbConn().listProjects(domain);
  };

  const updateScenes = (projectModel: ProjectModel) => {
    setActivityStatus(ActivityStatus.GETTING_SCENES);
    getNetwork().onListScenes(projectModel.uuid);
  };

  useKaraboEvent(KaraboEvent.DatabaseBusy, (hash: Hash) => {
    const is_processing = hash.getValue('is_processing');
    if (!is_processing && activityStatus === ActivityStatus.GETTING_SCENES) {
      setActivityStatus(ActivityStatus.NO_ACTIVITY);
      const scenes = selectedProject!.scenes ?? [];
      setScenes(scenes);
      if (scenes.length > 0) {
        setSelectedScene(scenes[0]);
      }
    }
  });

  const handleProjectClick = (project: ProjectModel) => {
    setSelectedProject(project);
    updateScenes(project);
    setSelectedScene(undefined);
  };

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
    if (open && !domainsInitializedRef.current) {
      domainsInitializedRef.current = true;
      setActivityStatus(ActivityStatus.GETTING_DOMAINS);
      getDbConn().listDomains();
    }
  }, [open]);

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
      return;
    }
    domains.sort((a, b) => a.localeCompare(b));
    setDomains(domains);
    if (selectedDomain.length === 0 || !domains.includes(selectedDomain)) {
      const storedDomain = getConfig().currentDomain;
      const currentTopic = sessionInfo?.guiServerTopic as string;
      const startupDomain = domains.includes(storedDomain)
        ? storedDomain
        : domains.includes(currentTopic)
          ? currentTopic
          : domains[0];
      setSelectedDomain(startupDomain);
      getConfig().currentDomain = startupDomain;
      updateProjects(startupDomain);
    } else {
      updateProjects(selectedDomain);
    }
    setActivityStatus(ActivityStatus.NO_ACTIVITY);
  });

  useKaraboEvent(KaraboEvent.ListProjects, (hash: Hash) => {
    if (!open) {
      // Don't handle ListProjects events when closed
      return;
    }
    const reason = hash.getValue('reason');
    if (reason.length > 0) {
      setErrorMessage(reason);
    } else {
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
      if (nonTrashedSorted.length > 0) {
        const selProject = nonTrashedSorted[0];
        setSelectedProject(selProject);
        updateScenes(selProject);
      }
    }
    setActivityStatus(ActivityStatus.NO_ACTIVITY);
  });

  useKaraboEvent(KaraboEvent.ListScenes, (hash: Hash) => {
    if (!open) {
      // Don't handle ListScenes events when closed
      return;
    }
    const reason = hash.getValue('reason');
    if (reason.length > 0) {
      setErrorMessage(reason);
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
      if (scenesSorted.length > 0) {
        setSelectedScene(scenesSorted[0]);
      }
    }
    setActivityStatus(ActivityStatus.NO_ACTIVITY);
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="w-[95vw] sm:w-[90vw] md:w-[85vw] lg:max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Load Project Scene</DialogTitle>
          <DialogDescription>
            Select a domain, project, and scene to load
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4 pr-2">
          {/* Domain selector */}
          <div>
            <DomainSelector
              domains={domains}
              selectedDomain={selectedDomain}
              onDomainChange={(domain) => {
                setSelectedDomain(domain);
                getConfig().currentDomain = domain;
                updateProjects(domain);
              }}
              disabled={activityStatus !== ActivityStatus.NO_ACTIVITY}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Projects */}
            <div className="min-w-0 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  Projects on Domain "{selectedDomain}"
                </h3>
                <span className="text-xs text-muted-foreground">
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
              />
            </div>

            {/* Scenes */}
            <div className="min-w-0 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  Scenes on Project "{selectedProject?.simple_name ?? ''}"
                </h3>
                <span className="text-xs text-muted-foreground">
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
              />
            </div>
          </div>
        </div>

        <Separator />

        <DialogFooter className="flex-row items-center justify-between">
          <LoadingStatus
            isLoading={activityStatus !== ActivityStatus.NO_ACTIVITY}
            loadingText={getStatusText()}
            error={errorMsg}
          />
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleSelectScene}
              disabled={!selectedScene}
              className="min-w-[140px]"
            >
              Open Scene
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
