import { Hash } from '@/karabo/data/api';
import { broadcast_event, KaraboEvent } from '@/lib/events';
import { showMessageBox } from '@/lib/messagebox';
import {
  getConfig,
  MAX_PROJECT_FAVORITES,
  type StoredProjectFavorite,
  type ProjectFavoriteSelection,
} from '@/lib/singletons/api';

export function addProjectFavorite(
  topic: string,
  favorite: StoredProjectFavorite
): void {
  if (!getConfig().addProjectFavorite(topic, favorite)) {
    showMessageBox({
      variant: 'warning',
      title: 'Favorites are full',
      msg: `You can keep up to ${MAX_PROJECT_FAVORITES} favorites. Remove one from Home to add another.`,
    });
    return;
  }
  broadcast_event(KaraboEvent.ProjectFavoritesChanged, new Hash({ topic }));
}

export function moveProjectFavorite(
  topic: string,
  selection: ProjectFavoriteSelection,
  toIndex: number
): void {
  getConfig().moveProjectFavorite(topic, selection, toIndex);
  broadcast_event(KaraboEvent.ProjectFavoritesChanged, new Hash({ topic }));
}

export function removeProjectFavorite(
  topic: string,
  selection: ProjectFavoriteSelection
): void {
  getConfig().removeProjectFavorite(topic, selection);
  broadcast_event(KaraboEvent.ProjectFavoritesChanged, new Hash({ topic }));
}
