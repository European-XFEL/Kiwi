import type { StoredProjectFavorite } from '@/lib/singletons/api';

export interface ProjectFavoritesListProps {
  favorites: readonly StoredProjectFavorite[];
  onOpen: (favorite: StoredProjectFavorite) => void;
  onRemove: (favorite: StoredProjectFavorite) => void;
  onMove: (favorite: StoredProjectFavorite, toIndex: number) => void;
  disabled?: boolean;
}
