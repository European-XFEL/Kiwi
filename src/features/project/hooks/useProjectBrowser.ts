import { useState } from 'react';
import { KaraboEvent, useKaraboEvent } from '@/lib/events';
import { getProjectModel } from '@/lib/singletons/api';
import {
  createProjectBrowser,
  type ProjectBrowserModel,
} from '../utils/createProjectBrowser';

// The announcement carries an empty Hash. The root is a live object graph that
// a Hash cannot transport, so it is always read back from the singleton.
function buildFromActiveRoot(): ProjectBrowserModel | undefined {
  const root = getProjectModel().root;
  return root ? createProjectBrowser(root) : undefined;
}

/**
 * Navigation for the active project, rebuilt on every root announcement.
 *
 * Rebuilt rather than cached because the project tree is filled in place while
 * loading: an unchanged root identity does not mean unchanged content, so the
 * announcement is the only reliable signal. Undefined while no project is
 * active.
 */
export function useProjectBrowser(): ProjectBrowserModel | undefined {
  // Seeded during the first render rather than from a mount effect, so a
  // project activated before this mounted renders immediately instead of after
  // a frame of empty navigation.
  const [browser, setBrowser] = useState(buildFromActiveRoot);

  useKaraboEvent(KaraboEvent.RootProjectChanged, () => {
    setBrowser(buildFromActiveRoot());
  });

  return browser;
}
