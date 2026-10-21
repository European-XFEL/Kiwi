import { AlarmCondition, State } from '@/karabo/data/api';

export type TrendMode = 'numeric' | 'state' | 'alarm';

// KaraboGui graph/common/const.py ALL_STATES ordering.
export const STATE_LABELS = [
  State.NORMAL,
  State.UNKNOWN,
  State.INIT,
  State.ERROR,
  State.INTERLOCKED,
  State.DISABLED,
  State.CHANGING,
  State.MOVING,
  State.OFF,
  State.ON,
  State.STOPPED,
  State.RUNNING,
  State.ACQUIRING,
  State.PROCESSING,
  State.HOMING,
  State.ACTIVE,
  State.PASSIVE,
  State.OPENED,
  State.CLOSED,
  State.PAUSED,
  State.OPENING,
  State.CLOSING,
  State.STARTED,
  State.INSERTED,
  State.MONITORING,
  State.IGNORING,
  State.INSERTING,
  State.STARTING,
  State.STOPPING,
  State.SEARCHING,
  State.STATIC,
  State.RAMPING_DOWN,
  State.RAMPING_UP,
  State.EXTRACTING,
  State.EXTRACTED,
  State.COOLING,
  State.COOLED,
  State.COLD,
  State.HEATING,
  State.HEATED,
  State.WARM,
  State.INTERLOCK_OK,
  State.INTERLOCK_BROKEN,
  State.PRESSURIZED,
  State.EVACUATED,
  State.EMPTYING,
  State.FILLING,
  State.DISENGAGING,
  State.DISENGAGED,
  State.ENGAGING,
  State.ENGAGED,
  State.SWITCHING_OFF,
  State.SWITCHING_ON,
  State.SWITCHING,
  State.ROTATING,
  State.ROTATING_CNTCLK,
  State.ROTATING_CLK,
  State.MOVING_LEFT,
  State.MOVING_DOWN,
  State.MOVING_BACK,
  State.MOVING_RIGHT,
  State.MOVING_UP,
  State.MOVING_FORWARD,
  State.UNLOCKED,
  State.LOCKED,
  State.INCREASING,
  State.DECREASING,
  State.KNOWN,
].map((state) => state.name);

export const ALARM_LABELS = [
  AlarmCondition.NONE,
  AlarmCondition.WARN,
  AlarmCondition.ALARM,
  AlarmCondition.INTERLOCK,
];

export function categoryLabels(mode: TrendMode): readonly string[] | undefined {
  return mode === 'state'
    ? STATE_LABELS
    : mode === 'alarm'
      ? ALARM_LABELS
      : undefined;
}

export function trendValue(raw: unknown, mode: TrendMode): number | undefined {
  const labels = categoryLabels(mode);
  if (labels) {
    if (typeof raw !== 'string') return undefined;
    const index = labels.indexOf(raw);
    return index < 0 ? undefined : index;
  }
  if (!['number', 'bigint', 'boolean'].includes(typeof raw)) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}
