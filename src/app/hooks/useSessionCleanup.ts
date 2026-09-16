import { useEffect, useRef } from 'react';
// NOTE: Imported from the module rather than the '@/features/scene-view/api'
// barrel on purpose. That barrel reaches bootstrapStatefulIcons via
// ControllerContainer. It uses import.meta.glob, which Jest cannot parse, so
// importing the barrel makes this hook untestable. WorkspaceShell does the same.
import { useActiveSceneStore } from '@/features/scene-view/hooks/useActiveScene';
import { getPanelWrangler } from '@/lib/singletons/api';
import { clearRootProject } from '@/features/project/api';
import { useGlobalStore } from '@/store/api';

// These singletons must not keep the previous session's project or scenes
// reachable by the next login.
function clearSessionState(): void {
  getPanelWrangler().resetWorkspace();
  clearRootProject();
  useActiveSceneStore.getState().setLoadedSceneRef(undefined);
  useActiveSceneStore.getState().setSceneLoadPending(false);
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
