import {
  GuiStateColorKey,
  CHANGING,
  RUNNING,
  ACTIVE,
  PASSIVE,
  DISABLED,
  EXACT_TO_COLOR,
} from '@/karabo_data/Indicators';

export function mapGuiStateColor(raw: string): GuiStateColorKey {
  //important because karabos state/indicator re all in upperCase
  const N = (s: string) => s.trim().toUpperCase();
  const s = N(raw);

  // Order matters: this mirrors the Python `get_state_color` cascade
  if (CHANGING.has(s)) return 'changingColor';
  if (RUNNING.has(s)) return 'runningColor';
  if (ACTIVE.has(s)) return 'activeColor';
  if (PASSIVE.has(s)) return 'passiveColor';
  if (DISABLED.has(s)) return 'disabledColor';

  const exact = EXACT_TO_COLOR[s];
  if (exact) return exact;

  return 'unknownColor';
}
