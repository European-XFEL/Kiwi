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
    <div data-testid="scenes-table" className="flex min-w-0 flex-col gap-2">
      {onQueryChange !== undefined && (
        <KiwiSearchInput
          value={query ?? ''}
          onChange={onQueryChange}
          placeholder="Filter scenes..."
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
                  Scene Name
                </TableHead>
                <TableHead className="sticky top-0 hidden w-44 bg-background sm:table-cell lg:w-auto">
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
                    data-testid={`scene-row-${scene.uuid}`}
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
                    <TableCell className="py-3 font-medium sm:max-w-xs lg:py-2">
                      {/* Keyboard access to the row: activating the button
                          clicks it, and that click reaches the row handler */}
                      <button
                        type="button"
                        disabled={selectionDisabled}
                        className="block w-full min-w-0 cursor-[inherit] rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="block truncate">
                          {scene.simple_name}
                        </span>
                        <span className="block truncate text-xs font-normal text-muted-foreground sm:hidden">
                          {asLocalDateTimeString(scene.date)}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="hidden truncate sm:table-cell">
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
