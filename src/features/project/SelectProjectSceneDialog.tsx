import React, { useRef, useState } from 'react';
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
import { getDbConn } from '@/lib/singletons/api';
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

  const updateProjects = (domain: string) => {
    setActivityStatus(ActivityStatus.GETTING_PROJECTS);
    setScenes([]);
    setSelectedScene(undefined);
    sceneSearch.clear();

    getDbConn().listProjects(domain);
  };

  const updateScenes = (
    domain: string,
    projectName: string,
    uuidProject: string
  ) => {
    setActivityStatus(ActivityStatus.GETTING_SCENES);
    getDbConn().listScenes(domain, projectName, uuidProject, (scenesInfo) => {
      if (scenesInfo.error_msg) {
        setErrorMessage(scenesInfo.error_msg);
      } else {
        setScenes(scenesInfo.scenes);
        if (scenesInfo.scenes.length > 0) {
          setSelectedScene(scenesInfo.scenes[0]);
        }
      }
      setActivityStatus(ActivityStatus.NO_ACTIVITY);
    });
  };

  const handleProjectClick = (project: ProjectModel) => {
    setSelectedProject(project);
    updateScenes(selectedDomain, project.simple_name, project.uuid);
    setSelectedScene(undefined);
  };

  const handleSceneClick = (scene: SceneModel) => {
    setSelectedScene(scene);
  };

  const handleSceneDoubleClick = (scene: SceneModel) => {
    setSelectedScene(scene);
    onSceneSelected(selectedDomain, selectedProject!.simple_name, scene);
  };

  const handleSelectScene = () => {
    if (selectedScene) {
      onSceneSelected(
        selectedDomain,
        selectedProject!.simple_name,
        selectedScene
      );
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
      const currentTopic = sessionInfo?.guiServerTopic as string;
      const startupDomain = domains.includes(currentTopic)
        ? currentTopic
        : domains[0];
      setSelectedDomain(startupDomain);
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
        updateScenes(selectedDomain, selProject.simple_name, selProject.uuid);
      }
    }
    setActivityStatus(ActivityStatus.NO_ACTIVITY);
  });

  // TODO: Enable a new event for the scenes of a project retrieved
  // useKaraboEvent(KaraboEvent.ListScenes, (hash: Hash) => {});

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
                updateProjects(domain);
              }}
              disabled={activityStatus !== ActivityStatus.NO_ACTIVITY}
            />
          </div>

          {/* Projects */}
          <div className="space-y-2">
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
          <div className="space-y-2">
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

        <Separator />

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <LoadingStatus
            isLoading={activityStatus !== ActivityStatus.NO_ACTIVITY}
            loadingText={getStatusText()}
            error={errorMsg}
          />
          <div className="flex gap-2">
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
