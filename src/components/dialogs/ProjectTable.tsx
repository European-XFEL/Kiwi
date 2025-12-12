import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ProjectItemInfo,
  asLocalDateTimeString,
} from '@/karabo_data/ProjectDbInfo';

export type ProjectsTableProps = {
  projects: ProjectItemInfo[];
  selectedProject?: ProjectItemInfo;
  onProjectClick: (project: ProjectItemInfo) => void;
};

export default function ProjectsTable({
  projects,
  selectedProject,
  onProjectClick,
}: ProjectsTableProps) {
  return (
    <ScrollArea className="h-48 rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-background">
          <TableRow>
            <TableHead>Project Name</TableHead>
            <TableHead>Last Modified</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={2}
                className="text-center text-muted-foreground"
              >
                No projects found
              </TableCell>
            </TableRow>
          ) : (
            projects.map((project, index) => (
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
  );
}
