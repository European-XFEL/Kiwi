import { AccessLevel } from '@/karabo/data/enums';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { AccessControlManager } from '@/features/user/utils/AccessLevel';

export function useAccessLevel() {
  const accessLevelFromStore =
    useGlobalStore((s) => s.sessionInfo?.accessLevel) ?? AccessLevel.OBSERVER;

  const ac = AccessControlManager.instance;

  return {
    accessLevel: accessLevelFromStore,
    originalLevel: ac.originalLevel,
    canChangeLevel: ac.canChangeLevel(), // true for Operator/Expert
    canChangeTo: (target: AccessLevel) => ac.canChangeTo(target),
    setLevel: (target: AccessLevel) => ac.setCurrentLevel(target),
  };
}
