import { create } from 'zustand';

interface GlobalActivityState {
  lastActivity: number | null;
  latestLatency: number | null; // Time, in seconds, that the latest processed message waited in the queue to be processed
  queuedMessageCount: number; // Number of messages received from the GUI server waiting to be processed
  messageCount: number; // Total messages received this session
  activityLevel: 'idle' | 'active' | 'moderate' | 'slow';

  // Actions
  updateActivity: (queuedMessageCount: number, latestLatency?: number) => void;
  reset: () => void;
}

const PROC_FINE = 2; // < 2 = fine (in seconds)
const PROC_ALARM = 5; // > 5 = slow (in seconds)

function getActivityLevel(
  latestLatency?: number | null
): GlobalActivityState['activityLevel'] {
  if (!latestLatency) return 'active';
  if (latestLatency < PROC_FINE) return 'active'; // Green
  if (latestLatency <= PROC_ALARM) return 'moderate'; // Yellow
  return 'slow'; // Red
}

export const useGlobalActivityStore = create<GlobalActivityState>((set) => ({
  lastActivity: null,
  latestLatency: null,
  queuedMessageCount: 0,
  messageCount: 0,
  activityLevel: 'idle',

  updateActivity: (queuedMessageCount: number, latestLatency?: number) =>
    set((state) => ({
      lastActivity: Date.now(),
      latestLatency: latestLatency ? latestLatency / 1_000 : null,
      queuedMessageCount: queuedMessageCount,
      messageCount: state.messageCount + 1,
      activityLevel: getActivityLevel(latestLatency),
    })),

  reset: () =>
    set({
      lastActivity: null,
      queuedMessageCount: 0,
      messageCount: 0,
      activityLevel: 'idle',
    }),
}));
