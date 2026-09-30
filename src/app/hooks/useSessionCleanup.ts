import { useEffect, useRef } from 'react';
import { getDbConn, getPanelWrangler } from '@/lib/singletons/api';
import { clearRootProject } from '@/features/project/api';
import { useGlobalStore } from '@/store/api';

// These singletons must not keep the previous session's project or scenes
// reachable by the next login.
function clearSessionState(): void {
  getPanelWrangler().resetWorkspace();
  clearRootProject();
  getDbConn().reset();
}

/**
 * Clears session-scoped UI state whenever a session ends.
 *
 * Keyed on `sessionInfo` going from present to absent rather than on a specific
 * user action, so every way a session can end is covered by construction:
 * logout, expiration and connection failure all clear `sessionInfo`. Attaching
 * the cleanup to a single logout handler instead would silently miss the
 * others, and would miss any path added later.
 */
export default function useSessionCleanup(): void {
  const sessionInfo = useGlobalStore((state) => state.sessionInfo);
  // Seeded from the first render so a cold start in a logged-out state is not
  // mistaken for a session that just ended.
  const hadSessionRef = useRef(sessionInfo !== undefined);

  useEffect(() => {
    const hasSession = sessionInfo !== undefined;
    const hadSession = hadSessionRef.current;
    hadSessionRef.current = hasSession;

    if (hadSession && !hasSession) {
      clearSessionState();
    }
  }, [sessionInfo]);
}
