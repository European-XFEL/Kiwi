import { State } from '@/karabo/data/api';
import active from '@/assets/icons/general/lamp-active.png';
import changing from '@/assets/icons/general/lamp-changing.png';
import disabled from '@/assets/icons/general/lamp-disabled.png';
import error from '@/assets/icons/general/lamp-error.png';
import init from '@/assets/icons/general/lamp-init.png';
import known from '@/assets/icons/general/lamp-known.png';
import passive from '@/assets/icons/general/lamp-passive.png';
import running from '@/assets/icons/general/lamp-running.png';
import staticLamp from '@/assets/icons/general/lamp-static.png';
import unknown from '@/assets/icons/general/lamp-unknown.png';

const assets = {
  active,
  changing,
  disabled,
  error,
  init,
  known,
  passive,
  running,
  static: staticLamp,
  unknown,
};

type LampName = keyof typeof assets;

const lampNames = new Map<State, LampName>([
  [State.CHANGING, 'changing'],
  [State.RUNNING, 'running'],
  [State.ACTIVE, 'active'],
  [State.PASSIVE, 'passive'],
  [State.STATIC, 'static'],
  [State.INIT, 'init'],
  [State.NORMAL, 'known'],
  [State.KNOWN, 'known'],
  [State.ERROR, 'error'],
  [State.UNKNOWN, 'unknown'],
  [State.DISABLED, 'disabled'],
]);

export function getLampName(value: unknown): LampName {
  if (typeof value !== 'string') return 'unknown';

  let state: State;
  try {
    state = new State(value);
  } catch {
    return 'unknown';
  }

  for (let current: State | null = state; current; current = current.parent) {
    const name = lampNames.get(current);
    if (name) return name;
  }

  return 'unknown';
}

export const getLampAsset = (value: unknown): string =>
  assets[getLampName(value)];
