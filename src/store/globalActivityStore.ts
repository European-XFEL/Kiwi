import { create } from 'zustand';

interface GlobalActivityState {
  lastActivity: number | null;
  processingDelay: number | null; // Track how long hash processing took
  messageCount: number; // Total messages received this session
  activityLevel: 'idle' | 'active' | 'moderate' | 'slow';

  // Actions
  bumpActivity: (delay?: number) => void;
  reset: () => void;
}

const PROC_FINE = 2000; // < 2s = fine (in ms)
const PROC_ALARM = 5000; // > 5s = slow (in ms)

function getActivityLevel(
  delay?: number | null
): GlobalActivityState['activityLevel'] {
  if (!delay) return 'active';
  if (delay < PROC_FINE) return 'active'; // Green
  if (delay <= PROC_ALARM) return 'moderate'; // Yellow
  return 'slow'; // Red
}

export const useGlobalActivityStore = create<GlobalActivityState>((set) => ({
  lastActivity: null,
  processingDelay: null,
  messageCount: 0,
  activityLevel: 'idle',

  bumpActivity: (delay) =>
    set((state) => ({
      lastActivity: Date.now(),
      processingDelay: delay ?? null,
      messageCount: state.messageCount + 1,
      activityLevel: getActivityLevel(delay),
    })),

  reset: () =>
    set({
      lastActivity: null,
      processingDelay: null,
      messageCount: 0,
      activityLevel: 'idle',
    }),
}));
