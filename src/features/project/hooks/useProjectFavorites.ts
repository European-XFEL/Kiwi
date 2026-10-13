import { useState } from 'react';
import type { Hash } from '@/karabo/data/api';
import { KaraboEvent, useKaraboEvent } from '@/lib/events';
import { getConfig } from '@/lib/singletons/api';

export function useProjectFavorites(topic: string) {
  const [, setRevision] = useState(0);
  useKaraboEvent(KaraboEvent.ProjectFavoritesChanged, (data: Hash) => {
    if (data.get('topic') === topic) {
      setRevision((revision) => revision + 1);
    }
  });
  return getConfig().getProjectFavorites(topic);
}
