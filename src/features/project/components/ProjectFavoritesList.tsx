import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';
import { Badge, Button, cn } from '@/components/api';
import { MAX_PROJECT_FAVORITES } from '@/lib/singletons/api';
import { useProjectFavoritesList } from '../hooks/useProjectFavoritesList';
import type { ProjectFavoritesListProps } from '../types/projectFavorites.types';

export default function ProjectFavoritesList({
  favorites,
  onOpen,
  onRemove,
  onMove,
  disabled = false,
}: ProjectFavoritesListProps) {
  const rows = useProjectFavoritesList(favorites, onMove, disabled);

  return (
    <section className="rounded-xl border bg-card text-card-foreground">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Project Favorites</h2>
          <Badge
            variant="outline"
            className="tabular-nums text-muted-foreground"
          >
            {favorites.length} / {MAX_PROJECT_FAVORITES}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Drag to set your priority order.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">
          To bookmark a project, use Load Project, right-click a project in the
          Projects tab, and choose Add to Favorites.
        </p>
      ) : (
        <ol aria-label="Favorite projects" className="space-y-0.5 p-2">
          {rows.map((row) => (
            <li
              key={row.key}
              {...row.dragProps}
              className={cn(
                'group flex items-center gap-2 rounded-lg border border-transparent px-2 py-1 transition-colors hover:bg-accent/50',
                !disabled && 'cursor-pointer',
                row.dragging && 'opacity-50',
                row.dropTarget && 'border-primary bg-accent/50'
              )}
            >
              <span
                {...row.handleProps}
                aria-label={`Drag favorite ${row.favorite.projectName}`}
                className={cn(
                  'inline-flex shrink-0 text-muted-foreground',
                  !disabled && 'cursor-grab active:cursor-grabbing'
                )}
              >
                <GripVertical aria-hidden="true" className="size-4" />
              </span>
              <span className="text-sm tabular-nums text-muted-foreground">
                {row.rank}
              </span>
              <Button
                variant="ghost"
                onClick={() => onOpen(row.favorite)}
                disabled={disabled}
                aria-label={`Open favorite ${row.favorite.projectName}`}
                title={`${row.favorite.projectName} (${row.favorite.domain})`}
                className="h-8 min-w-0 flex-1 cursor-pointer justify-start px-1 font-normal hover:bg-transparent dark:hover:bg-transparent"
              >
                <span className="truncate text-sm">
                  <strong>{row.favorite.projectName}</strong>
                  <span className="ml-2 text-muted-foreground">
                    {row.favorite.domain}
                  </span>
                </span>
              </Button>
              <div className="flex shrink-0 items-center sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={row.onMoveUp}
                  disabled={row.moveUpDisabled}
                  aria-label={`Move ${row.favorite.projectName} up`}
                  title="Move up"
                  className="size-8 transition-none"
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={row.onMoveDown}
                  disabled={row.moveDownDisabled}
                  aria-label={`Move ${row.favorite.projectName} down`}
                  title="Move down"
                  className="size-8 transition-none"
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(row.favorite)}
                  disabled={disabled}
                  aria-label={`Remove favorite ${row.favorite.projectName}`}
                  title="Remove from favorites"
                  className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
