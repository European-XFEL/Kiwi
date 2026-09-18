import { ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/api';
import { KiwiSearchInput } from '@/components/api';
import { asLocalDateTimeString } from '@/karabo/common/project/api';
import type { ProjectsTableProps } from '../types/project.types';

export default function ProjectsTable({
  projects,
  selectedProject,
  onProjectClick,
  query,
  onQueryChange,
  selectionDisabled = false,
}: ProjectsTableProps) {
  return (
    <div data-testid="projects-table" className="flex min-w-0 flex-col gap-2">
      {onQueryChange !== undefined && (
        <KiwiSearchInput
          value={query ?? ''}
          onChange={onQueryChange}
          data-testid="projects-search"
          placeholder="Filter projects..."
          className="w-full min-w-0"
        />
      )}
      {/* Radix wraps the viewport content in a display: table div that grows
          with the widest row, which pushes the last column out of view and
          stops names from truncating */}
      <ScrollArea className="h-[40dvh] rounded-md border sm:h-[50dvh] lg:h-48 [&_[data-radix-scroll-area-viewport]>div]:block!">
        <div className="w-full overflow-x-auto">
          <Table className="table-fixed lg:min-w-max lg:table-auto">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 bg-background">
                  Project Name
                </TableHead>
                <TableHead className="sticky top-0 hidden w-44 bg-background sm:table-cell lg:w-auto">
                  Last Modified
                </TableHead>
                <TableHead className="sticky top-0 w-10 bg-background lg:hidden">
                  <span className="sr-only">Open</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground"
                  >
                    {query ? 'No matching projects' : 'No projects found'}
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project, index) => (
                  <TableRow
                    key={`${index}::${project.uuid}`}
                    data-testid={`project-row-${project.uuid}`}
                    onClick={
                      selectionDisabled
                        ? undefined
                        : () => onProjectClick(project)
                    }
                    aria-disabled={selectionDisabled || undefined}
                    data-selected={
                      selectedProject?.uuid === project.uuid || undefined
                    }
                    className={
                      selectionDisabled
                        ? `cursor-not-allowed opacity-60 ${
                            selectedProject?.uuid === project.uuid
                              ? 'bg-accent'
                              : ''
                          }`
                        : `cursor-pointer ${
                            selectedProject?.uuid === project.uuid
                              ? 'bg-accent'
                              : 'hover:bg-accent/50'
                          }`
                    }
                  >
                    <TableCell className="py-3 font-medium sm:max-w-xs lg:py-2">
                      {/* Keyboard access to the row: activating the button
                          clicks it, and that click reaches the row handler */}
                      <button
                        type="button"
                        disabled={selectionDisabled}
                        data-testid="project-select"
                        className="block w-full min-w-0 cursor-[inherit] rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="block truncate">
                          {project.simple_name}
                        </span>
                        <span className="block truncate text-xs font-normal text-muted-foreground sm:hidden">
                          {asLocalDateTimeString(project.date)}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="hidden truncate sm:table-cell">
                      {asLocalDateTimeString(project.date)}
                    </TableCell>
                    <TableCell className="w-10 text-muted-foreground lg:hidden">
                      <ChevronRight aria-hidden="true" className="size-5" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </div>
  );
}
