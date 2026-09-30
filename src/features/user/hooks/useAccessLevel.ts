import { AccessLevel } from '@/karabo/data/api';
import { useGlobalStore } from '@/store/api';
import { getConfig } from '@/lib/singletons/api';
import { AccessControlManager } from '@/features/user/utils/AccessLevel';

export function useAccessLevel() {
  const accessLevelFromStore =
    useGlobalStore((s) => s.sessionInfo?.accessLevel) ?? AccessLevel.OBSERVER;

  const ac = AccessControlManager.instance;

  const changeLevel = async (newLevel: AccessLevel) => {
    const { sessionInfo, setLoggedIn } = useGlobalStore.getState();
    if (!sessionInfo) {
      return;
    }

    if (!ac.canChangeTo(newLevel)) {
      console.warn(
        `User cannot change access level from ${AccessLevel[accessLevelFromStore]} to ${AccessLevel[newLevel]}`
      );
      return;
    }

    // Update central manager + store
    ac.setCurrentLevel(newLevel);

    // Optionally also sync sessionInfo in store (for consistency)
    setLoggedIn({
      ...sessionInfo,
      accessLevel: newLevel,
    });

    // Persist the change to encrypted localStorage for non-auth sessions only
    try {
      const storedSession = await getConfig().loadSession();

      if (storedSession && !storedSession.refreshToken) {
        await getConfig().saveNonAuthSession(sessionInfo.loggedUser, newLevel);
        console.debug(
          `Access level changed to: ${AccessLevel[newLevel]} and persisted to session storage`
        );
      } else if (storedSession?.refreshToken) {
        console.warn(
          'Access level change not persisted: Auth sessions are controlled by backend'
        );
      }
    } catch (error) {
      console.error('Failed to persist access level change:', error);
    }
  };

  return {
    accessLevel: accessLevelFromStore,
    originalLevel: ac.originalLevel,
    canChangeLevel: ac.canChangeLevel(), // true for Operator/Expert
    canChangeTo: (target: AccessLevel) => ac.canChangeTo(target),
    setLevel: (target: AccessLevel) => ac.setCurrentLevel(target),
    changeLevel,
  };
}
