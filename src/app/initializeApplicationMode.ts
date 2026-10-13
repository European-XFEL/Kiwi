import { captureCinemaLaunch, CINEMA_PATH } from '@/features/cinema/api';
import { useApplicationModeStore } from '@/store/api';

/** Choose the mode before constructing the router or starting a session. */
export function initializeApplicationMode(): void {
  const state =
    window.location.pathname === CINEMA_PATH
      ? {
          mode: 'cinema' as const,
          ...captureCinemaLaunch(
            window.location,
            window.sessionStorage,
            (path) =>
              window.history.replaceState(window.history.state, '', path)
          ),
        }
      : { mode: 'normal' as const };
  useApplicationModeStore.setState(state, true);
}
