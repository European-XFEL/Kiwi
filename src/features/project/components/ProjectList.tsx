import { Check, ChevronDown } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  KiwiSearchInput,
  cn,
} from '@/components/api';
import { useProjectListKeyboard } from '../hooks/useProjectListKeyboard';
import { useMenuFocusReturn } from '../hooks/useMenuFocusReturn';
import ProjectIcon from './ProjectIcon';
import type { ProjectBrowserEntry } from '../utils/createProjectBrowser';

type ProjectListProps = {
  projects: ProjectBrowserEntry[];
  rootProjectUuid: string;
  selectedProject: ProjectBrowserEntry;
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (projectUuid: string) => void;
};

export default function ProjectList({
  projects,
  rootProjectUuid,
  selectedProject,
  query,
  onQueryChange,
  onSelect,
}: ProjectListProps) {
  const keyboard = useProjectListKeyboard();
  const label = selectedProject.projectName || 'Project not loaded';
  const focusReturn = useMenuFocusReturn();

  return (
    <DropdownMenu onOpenChange={(open) => !open && onQueryChange('')}>
      <DropdownMenuTrigger asChild>
        <Button
          data-testid="project-selector"
          ref={focusReturn.triggerRef}
          type="button"
          variant="ghost"
          size="sm"
          title={label}
          className={cn(
            'h-8 min-w-0 max-w-48 shrink gap-1 px-2 text-base font-semibold tracking-normal [word-spacing:normal]',
            selectedProject.isTrashed &&
              'text-fuchsia-600 dark:text-fuchsia-400'
          )}
        >
          <ProjectIcon
            isRoot={selectedProject.projectUuid === rootProjectUuid}
            isTrashed={selectedProject.isTrashed}
          />
          <span className="truncate">{label}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        onFocusCapture={keyboard.onContentFocusCapture}
        {...focusReturn.contentProps}
        align="start"
        sideOffset={6}
        className="w-[min(22rem,90vw)] p-1.5"
      >
        <div className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Projects
        </div>
        <div ref={keyboard.searchRef} onKeyDown={keyboard.onSearchKeyDown}>
          <KiwiSearchInput
            data-testid="project-search"
            value={query}
            onChange={onQueryChange}
            placeholder="Filter projects..."
            className="mb-2.5"
          />
        </div>
        <div
          ref={keyboard.resultsRef}
          onKeyDownCapture={keyboard.onResultsKeyDownCapture}
          className="max-h-72 space-y-1 overflow-y-auto"
        >
          {projects.length ? (
            projects.map((project) => (
              <DropdownMenuItem
                key={project.projectUuid}
                data-testid={`project-option-${project.projectUuid}`}
                disabled={!project.isLoaded}
                aria-current={
                  project.projectUuid === selectedProject.projectUuid
                    ? 'true'
                    : undefined
                }
                aria-label={
                  project.isTrashed
                    ? `${project.projectName} (Trashed)`
                    : undefined
                }
                title={project.projectName}
                onSelect={() => onSelect(project.projectUuid)}
                className={cn(
                  'min-h-8 cursor-pointer py-2 focus:bg-secondary/12',
                  project.projectUuid === rootProjectUuid
                    ? 'bg-secondary/15 ring-1 ring-secondary/40 ring-inset focus:bg-secondary/25'
                    : project.subprojectUuids.length > 0 && 'bg-foreground/5',
                  project.isTrashed &&
                    'text-fuchsia-600 focus:text-fuchsia-600 dark:text-fuchsia-400 dark:focus:text-fuchsia-400'
                )}
              >
                <ProjectIcon
                  isRoot={project.projectUuid === rootProjectUuid}
                  isTrashed={project.isTrashed}
                />
                <span
                  className={cn(
                    'truncate',
                    project.projectUuid === rootProjectUuid && 'font-semibold'
                  )}
                >
                  {project.projectName || 'Project not loaded'}
                </span>
                {project.projectUuid === selectedProject.projectUuid ? (
                  <Check className="ml-auto size-3.5" />
                ) : null}
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              No projects found
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
