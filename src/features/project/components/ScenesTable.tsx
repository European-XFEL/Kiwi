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
  selectionDisabled = false,
}: ScenesTableProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {onQueryChange !== undefined && (
        <KiwiSearchInput
          value={query ?? ''}
          onChange={onQueryChange}
          placeholder="Filter scenes..."
          className="w-full min-w-0"
        />
      )}
      <ScrollArea className="h-48 rounded-md border">
        <div className="w-full overflow-x-auto">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 bg-background">
                  Scene Name
                </TableHead>
                <TableHead className="sticky top-0 bg-background">
                  Last Modified
                </TableHead>
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
                    onClick={
                      selectionDisabled ? undefined : () => onSceneClick(scene)
                    }
                    onDoubleClick={
                      selectionDisabled
                        ? undefined
                        : () => onSceneDoubleClick(scene)
                    }
                    aria-disabled={selectionDisabled || undefined}
                    className={
                      selectionDisabled
                        ? `cursor-not-allowed opacity-60 ${
                            selectedScene?.uuid === scene.uuid
                              ? 'bg-accent'
                              : ''
                          }`
                        : `cursor-pointer ${
                            selectedScene?.uuid === scene.uuid
                              ? 'bg-accent'
                              : 'hover:bg-accent/50'
                          }`
                    }
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
        </div>
      </ScrollArea>
    </div>
  );
}
