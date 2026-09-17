import { useId, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/components/api';
import type { useRootProject } from '../hooks/useRootProject';
import ProjectList from './ProjectList';
import ProjectSceneList from './ProjectSceneList';

type ProjectBrowserProps = {
  browser: ReturnType<typeof useRootProject>;
  className?: string;
};

export default function ProjectBrowser({
  browser,
  className,
}: ProjectBrowserProps) {
  const id = useId();
  // Held per view rather than in useRootProject: the headers render a mobile
  // and a desktop browser from one hook, and menu content is portalled out of
  // the hidden one, so a shared flag would open both scene lists.
  const [sceneListOpen, setSceneListOpen] = useState(false);

  if (!browser.rootProject || !browser.selectedProject) {
    return null;
  }

  const selectProject = (projectUuid: string) => {
    const project = browser.projects.find(
      (entry) => entry.projectUuid === projectUuid
    );
    browser.selectProject(projectUuid);
    // Only a list that can be opened: the trigger is disabled otherwise.
    setSceneListOpen(Boolean(project?.isLoaded && project.scenes.length > 0));
  };

  return (
    <div
      id={id}
      className={cn(
        'flex min-w-0 max-w-full items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-1',
        className
      )}
    >
      <span
        title={browser.rootProject.projectName}
        className={cn(
          'max-w-48 shrink truncate pl-1 text-base font-medium text-muted-foreground',
          browser.rootProject.isTrashed &&
            'text-fuchsia-600 dark:text-fuchsia-400'
        )}
      >
        {browser.rootProject.projectName}
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-3.5 shrink-0 text-muted-foreground/60"
      />
      <ProjectList
        projects={browser.projects}
        rootProjectUuid={browser.rootProject.projectUuid}
        selectedProject={browser.selectedProject}
        query={browser.query}
        onQueryChange={browser.setQuery}
        onSelect={selectProject}
      />
      <span
        aria-hidden="true"
        className="mx-1 h-4 shrink-0 border-l border-border"
      />
      <ProjectSceneList
        scenes={browser.filteredScenes}
        sceneCount={browser.selectedProject.scenes.length}
        query={browser.sceneQuery}
        onQueryChange={browser.setSceneQuery}
        isLoaded={browser.selectedProject.isLoaded}
        onOpenScene={browser.openScene}
        open={sceneListOpen}
        onOpenChange={setSceneListOpen}
      />
    </div>
  );
}
