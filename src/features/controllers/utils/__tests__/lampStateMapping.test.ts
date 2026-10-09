import { getLampName } from '../lampStateMapping';

test.each([
  ['CHANGING', 'changing'],
  ['RUNNING', 'running'],
  ['ACTIVE', 'active'],
  ['PASSIVE', 'passive'],
  ['STATIC', 'static'],
  ['INIT', 'init'],
  ['NORMAL', 'known'],
  ['KNOWN', 'known'],
  ['ERROR', 'error'],
  ['UNKNOWN', 'unknown'],
  ['DISABLED', 'disabled'],
  ['MOVING_UP', 'changing'],
  ['ACQUIRING', 'running'],
  ['ON', 'active'],
  ['OFF', 'passive'],
  ['INTERLOCK_OK', 'static'],
  ['PAUSED', 'disabled'],
  ['not-a-state', 'unknown'],
  [undefined, 'unknown'],
  ['', 'unknown'],
] as const)('maps %s to the %s lamp', (value, expected) => {
  expect(getLampName(value)).toBe(expected);
});
