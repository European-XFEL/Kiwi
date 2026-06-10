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
import type { ScenesTableProps } from '../types/project.types';

export default function ScenesTable({
  scenes,
  selectedScene,
  onSceneClick,
  onSceneDoubleClick,
  query,
  onQueryChange,
}: ScenesTableProps) {
  return (
    <div className="flex flex-col gap-2">
      {onQueryChange !== undefined && (
        <KiwiSearchInput
          value={query ?? ''}
          onChange={onQueryChange}
          placeholder="Filter scenes..."
        />
      )}
      <ScrollArea className="h-48 rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead>Scene Name</TableHead>
              <TableHead>Last Modified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scenes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-center text-muted-foreground"
                >
                  {query ? 'No matching scenes' : 'No scenes available'}
                </TableCell>
              </TableRow>
            ) : (
              scenes.map((scene, index) => (
                <TableRow
                  key={`${index}::${scene.uuid}`}
                  onClick={() => onSceneClick(scene)}
                  onDoubleClick={() => onSceneDoubleClick(scene)}
                  className={`cursor-pointer ${
                    selectedScene?.uuid === scene.uuid
                      ? 'bg-accent'
                      : 'hover:bg-accent/50'
                  }`}
                >
                  <TableCell className="font-medium truncate max-w-xs">
                    {scene.simple_name}
                  </TableCell>
                  <TableCell className="truncate">
                    {asLocalDateTimeString(scene.date)}
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
