import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Separator,
} from '@/components/api';
import { Hash, HashList } from '@/karabo/data/api';
import { getConfig, getDbConn } from '@/lib/singletons/api';
import { ProjectModel } from '@/karabo/common/project/api';
import { useGlobalStore } from '@/store/api';
import { LoadingStatus } from '@/features/status';
import { useKaraboEvent, KaraboEvent } from '@/lib/events';
import DomainSelector from './components/DomainSelector';
import ProjectsTable from './components/ProjectTable';
import type { SelectProjectSceneDialogProps } from './types/project.types';
import { getDomains } from './utils/getDomains';
import { useDeferredSearch } from './hooks/useDeferredSearch';
import { filterByQuery } from './utils/filterByQuery';

type Activity = 'idle' | 'domains' | 'projects';

export default function SelectProjectSceneDialog({
  open,
  onProjectSelected,
  onCancel,
}: SelectProjectSceneDialogProps) {
  const sessionInfo = useGlobalStore((state) => state.sessionInfo);
  const [activity, setActivity] = useState<Activity>('idle');
  const [errorMsg, setErrorMessage] = useState('');
  const [domains, setDomains] = useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [projects, setProjects] = useState<ProjectModel[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectModel>();
  const domainsInitialized = useRef(false);
  const search = useDeferredSearch();
  const isBusy = activity !== 'idle';
  const filteredProjects = useMemo(
    () =>
      filterByQuery(
        projects,
        search.deferredQuery,
        (project) => project.simple_name
      ),
    [projects, search.deferredQuery]
  );

  const updateProjects = (domain: string) => {
    setErrorMessage('');
    setActivity('projects');
    setProjects([]);
    setSelectedProject(undefined);
    getDbConn().listProjects(domain);
  };

  useEffect(() => {
    if (!open) {
      // A late reply is ignored while closed, so request fresh domains next time.
      if (isBusy || errorMsg) {
        domainsInitialized.current = false;
      }
      setActivity('idle');
      setErrorMessage('');
      return;
    }
    if (!domainsInitialized.current) {
      domainsInitialized.current = true;
      setActivity('domains');
      getDbConn().listDomains();
    }
  }, [errorMsg, isBusy, open]);

  useKaraboEvent(KaraboEvent.ListDomains, (hash: Hash) => {
    if (!open || activity !== 'domains') {
      return;
    }
    try {
      const available = getDomains(hash).sort((a, b) => a.localeCompare(b));
      setDomains(available);
      if (available.length === 0) {
        setSelectedDomain('');
        setSelectedProject(undefined);
        setProjects([]);
        setActivity('idle');
        return;
      }
      let domain = selectedDomain;
      if (!available.includes(domain)) {
        const storedDomain = getConfig().currentDomain;
        if (
          sessionInfo?.guiServerTopic &&
          available.includes(sessionInfo.guiServerTopic)
        ) {
          domain = sessionInfo.guiServerTopic;
        } else if (available.includes(storedDomain)) {
          domain = storedDomain;
        } else {
          domain = available[0];
        }
      }
      setSelectedDomain(domain);
      getConfig().currentDomain = domain;
      updateProjects(domain);
    } catch (error) {
      setErrorMessage(
        `Error reading domains: ${error}. Close and reopen the dialog.`
      );
      setActivity('idle');
    }
  });

  useKaraboEvent(KaraboEvent.ListProjects, (hash: Hash) => {
    if (!open || activity !== 'projects') {
      return;
    }
    const reason = hash.getValue<string>('reason');
    if (reason.length > 0) {
      setErrorMessage(reason);
      setProjects([]);
      setSelectedProject(undefined);
    } else {
      const available = hash
        .getValue<HashList>('reply.items')
        .map(
          (item) =>
            new ProjectModel({
              uuid: item.getValue('uuid'),
              date: item.getValue('date'),
              simple_name: item.getValue('simple_name'),
              is_trashed: item.getValue('is_trashed'),
            })
        )
        .filter((project) => !project.is_trashed)
        .sort((a, b) => a.simple_name.localeCompare(b.simple_name));
      setProjects(available);
      setSelectedProject(available[0]);
    }
    setActivity('idle');
  });

  const openProject = (project: ProjectModel) => {
    if (!isBusy && selectedDomain) {
      onProjectSelected(selectedDomain, project);
    }
  };

  let loadingText = '';
  if (activity === 'domains') {
    loadingText = 'Retrieving domains...';
  } else if (activity === 'projects') {
    loadingText = 'Retrieving projects...';
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onCancel();
        }
      }}
    >
      <DialogContent
        data-testid="select-project-scene-dialog"
        className="w-[95vw] sm:max-w-3xl max-h-[90dvh] gap-4 overflow-hidden p-4 sm:p-6 flex flex-col"
      >
        <DialogHeader>
          <DialogTitle>Load Project</DialogTitle>
          <DialogDescription>
            Select a domain and project to load
          </DialogDescription>
        </DialogHeader>
        <section
          aria-label="Projects"
          className="min-h-0 space-y-4 overflow-auto"
        >
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
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-sm font-semibold">
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
              onProjectClick={setSelectedProject}
              onProjectDoubleClick={openProject}
              query={search.query}
              onQueryChange={search.setQuery}
              selectionDisabled={isBusy}
            />
          </div>
        </section>
        <Separator />
        <LoadingStatus
          isLoading={isBusy}
          loadingText={loadingText}
          error={errorMsg}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            disabled={isBusy || !selectedDomain || !selectedProject}
            onClick={() => {
              if (selectedProject && !isBusy) {
                openProject(selectedProject);
              }
            }}
          >
            Open Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
