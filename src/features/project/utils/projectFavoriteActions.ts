import { Hash } from '@/karabo/data/api';
import { broadcast_event, KaraboEvent } from '@/lib/events';
import {
  getConfig,
  type StoredProjectFavorite,
  type ProjectFavoriteSelection,
} from '@/lib/singletons/api';

export function addProjectFavorite(
  topic: string,
  favorite: StoredProjectFavorite
): void {
  getConfig().addProjectFavorite(topic, favorite);
  broadcast_event(KaraboEvent.ProjectFavoritesChanged, new Hash({ topic }));
}

export function removeProjectFavorite(
  topic: string,
  selection: ProjectFavoriteSelection
): void {
  getConfig().removeProjectFavorite(topic, selection);
  broadcast_event(KaraboEvent.ProjectFavoritesChanged, new Hash({ topic }));
}
