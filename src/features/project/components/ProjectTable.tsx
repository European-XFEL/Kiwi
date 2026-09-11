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
    <div className="flex min-w-0 flex-col gap-2">
      {onQueryChange !== undefined && (
        <KiwiSearchInput
          value={query ?? ''}
          onChange={onQueryChange}
          placeholder="Filter projects..."
          className="w-full min-w-0"
        />
      )}
      <ScrollArea className="h-48 rounded-md border">
        <div className="w-full overflow-x-auto">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 bg-background">
                  Project Name
                </TableHead>
                <TableHead className="sticky top-0 bg-background">
                  Last Modified
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="text-center text-muted-foreground"
                  >
                    {query ? 'No matching projects' : 'No projects found'}
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project, index) => (
                  <TableRow
                    key={`${index}::${project.uuid}`}
                    onClick={
                      selectionDisabled
                        ? undefined
                        : () => onProjectClick(project)
                    }
                    aria-disabled={selectionDisabled || undefined}
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
                    <TableCell className="font-medium truncate max-w-xs">
                      {project.simple_name}
                    </TableCell>
                    <TableCell className="truncate">
                      {asLocalDateTimeString(project.date)}
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
