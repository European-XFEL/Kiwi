/**
 * User Feature - Type Definitions
 */

import type { AccessLevel } from '@/karabo/data/api';

export type ConnectionTimerProps = {
  className?: string;
};

export type AccessLevelSelectorProps = {
  accessLevel: AccessLevel;
  canChangeLevel: boolean;
  canChangeTo: (level: AccessLevel) => boolean;
  onChange: (level: AccessLevel) => void;
  compact?: boolean;
  badgeClassName?: string;
};

export type UserProfileProps = {
  loggedUser: string;
  topic?: string;
  onLogout: () => void;
  nameClassName?: string;
};
