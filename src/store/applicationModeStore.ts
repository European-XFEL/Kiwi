import { create } from 'zustand';
import type { CinemaLaunch } from '@/features/cinema/api';

export type ApplicationMode = 'normal' | 'cinema';

export interface ApplicationModeState {
  mode: ApplicationMode;
  launch?: CinemaLaunch;
  launchError?: string;
}

export const useApplicationModeStore = create<ApplicationModeState>(() => ({
  mode: 'normal',
}));
