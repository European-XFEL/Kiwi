import { Input } from '@/components/input';
import { ScrollArea } from '@/components/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/table';
import { asLocalDateTimeString } from '@/karabo/common/project/api';
import { Search } from 'lucide-react';
import { useState } from 'react';
import type { ProjectsTableProps } from '../types/project.types';

export default function ProjectsTable({
  projects,
  selectedProject,
  onProjectClick,
}: ProjectsTableProps) {
  const [query, setQuery] = useState('');

  const filtered = query
    ? projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : projects;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Filter projects..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>
      <ScrollArea className="h-48 rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead>Project Name</TableHead>
              <TableHead>Last Modified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-center text-muted-foreground"
                >
                  {query ? 'No matching projects' : 'No projects found'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((project, index) => (
                <TableRow
                  key={`${index}::${project.uuid}`}
                  onClick={() => onProjectClick(project)}
                  className={`cursor-pointer ${
                    selectedProject?.uuid === project.uuid
                      ? 'bg-accent'
                      : 'hover:bg-accent/50'
                  }`}
                >
                  <TableCell className="font-medium truncate max-w-xs">
                    {project.name}
                  </TableCell>
                  <TableCell className="truncate">
                    {asLocalDateTimeString(project.dateModified)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
