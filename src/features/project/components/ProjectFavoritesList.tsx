import { Folder, Trash2 } from 'lucide-react';
import { Button, Separator } from '@/components/api';
import type { StoredProjectFavorite } from '@/lib/singletons/api';

export interface ProjectFavoritesListProps {
  favorites: readonly StoredProjectFavorite[];
  onOpen: (favorite: StoredProjectFavorite) => void;
  onRemove: (favorite: StoredProjectFavorite) => void;
  disabled?: boolean;
}

export default function ProjectFavoritesList({
  favorites,
  onOpen,
  onRemove,
  disabled = false,
}: ProjectFavoritesListProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold mb-2">Project Favorites</h2>
      <Separator />
      <div className="space-y-1">
        {favorites.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            To bookmark a scene, use Load Project, right-click a scene in the
            Projects tab, and choose Add to Favorites.
          </p>
        ) : (
          favorites.map((favorite) => (
            <div
              key={JSON.stringify([
                favorite.domain,
                favorite.projectUuid,
                favorite.sceneUuid,
              ])}
              className="group flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent/50"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpen(favorite)}
                disabled={disabled}
                aria-label={`Open favorite ${favorite.sceneName}`}
                title="Open scene"
                className="shrink-0"
              >
                <Folder className="h-4 w-4 text-primary" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(favorite)}
                aria-label={`Remove favorite ${favorite.sceneName}`}
                title="Remove from favorites"
                className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  <strong>{favorite.projectName}</strong>:{favorite.sceneName}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
