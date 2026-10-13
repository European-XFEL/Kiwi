import type { ApplicationMode } from '@/store/api';
import type { WorkspacePolicy } from './types';

export const HOME_TAB_ID = 'home' as const;
export const CINEMA_TAB_ID = 'cinema' as const;

export function createWorkspacePolicy(
  mode: ApplicationMode = 'normal'
): WorkspacePolicy {
  if (mode === 'cinema') {
    return {
      defaultCenterTab: { id: CINEMA_TAB_ID, title: 'Cinema', closable: false },
      persistActiveTab: false,
      showProjectNavigation: false,
    };
  }
  return {
    defaultCenterTab: { id: HOME_TAB_ID, title: 'Home', closable: false },
    persistActiveTab: true,
    showProjectNavigation: true,
  };
}
