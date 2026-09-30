/**
 * Status Feature - Type Definitions
 */

import type { GlobalActivityState } from '@/store/api';

export type ActiveIndicatorProps = Pick<
  GlobalActivityState,
  'lastActivity' | 'activityLevel'
>;

export type GuiServerDisplayProps = {
  className?: string;
};

export type LoadingStatusProps = {
  isLoading: boolean;
  loadingText?: string;
  error?: string;
};

export type TopicDisplayProps = {
  className?: string;
};
