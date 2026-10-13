import { useCallback, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRootProject } from '@/features/project/api';
import { useAccessLevel } from '@/features/user';
import { getNetwork, getPanelWrangler } from '@/lib/singletons/api';
import {
  useGlobalActivityStore,
  useGlobalStore,
  useApplicationModeStore,
} from '@/store/api';
import { broadcast_event, KaraboEvent } from '@/lib/events';
import { CINEMA_PATH } from '@/features/cinema/api';
import type { WorkspaceRuntime } from '../types';

export default function useWorkspaceRuntime(): WorkspaceRuntime {
  const mode = useApplicationModeStore((state) => state.mode);
  const navigate = useNavigate();
  const sessionInfo = useGlobalStore((state) => state.sessionInfo);
  const globalState = useGlobalStore((state) => state.globalState);
  const setLoggedOut = useGlobalStore((state) => state.setLoggedOut);
  const wrangler = getPanelWrangler();
  const sceneTabOpen = useSyncExternalStore(
    wrangler.subscribe,
    wrangler.isSceneTabOpen
  );
  // PanelWrangler retains DatabaseBusy state, including events before mount.
  const projectLoading = useSyncExternalStore(
    wrangler.subscribe,
    () => wrangler.getSnapshot().projectLoading
  );
  const lastActivity = useGlobalActivityStore((state) => state.lastActivity);
  const activityLevel = useGlobalActivityStore((state) => state.activityLevel);
  const { accessLevel, canChangeLevel, canChangeTo, changeLevel } =
    useAccessLevel();
  const browser = useRootProject();
  const onGoToHomeTab = useCallback(() => {
    broadcast_event(KaraboEvent.GoToHomeTab, {});
  }, []);

  const onLogout = useCallback(() => {
    getNetwork().finishSession();
    setLoggedOut();
    navigate(mode === 'cinema' ? CINEMA_PATH : '/', { replace: true });
  }, [navigate, setLoggedOut, mode]);

  let guiServerDesc: string | undefined = undefined;
  if (sessionInfo?.guiServerHost && sessionInfo?.guiServerPort) {
    guiServerDesc = `${sessionInfo.guiServerHost}:${sessionInfo.guiServerPort}`;
    if (sessionInfo?.isReadOnly) {
      guiServerDesc = `${guiServerDesc} (read-only)`;
    }
  }

  return {
    access: sessionInfo
      ? { accessLevel, canChangeLevel, canChangeTo, onChange: changeLevel }
      : undefined,
    sceneTabOpen,
    activity: { lastActivity, activityLevel },
    browser,
    connected:
      globalState === 'LOGGED_IN' ||
      globalState === 'NOTIFIED_SESSION_EXPIRATION',
    guiServer: guiServerDesc,
    guiServerVersion: sessionInfo?.guiServerVersion,
    onGoToHomeTab,
    projectLoading,
    topic: sessionInfo?.guiServerTopic,
    user: sessionInfo
      ? {
          loggedUser: sessionInfo.loggedUser,
          topic: sessionInfo.guiServerTopic,
          onLogout,
        }
      : undefined,
  };
}
