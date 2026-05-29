import { State } from '@/karabo/data/api';

const StateColors = {
  UNKNOWN: 'rgba(255,170,0,1)',
  NORMAL: 'rgba(200,200,200,1)',
  INIT: 'rgba(230,230,170,1)',
  DISABLED: 'rgba(255,0,255,1)',
  ERROR: 'rgba(255,0,0,1)',
  CHANGING: 'rgba(0,170,255,1)',
  RUNNING: 'rgba(153,204,255,1)',
  STATIC: 'rgba(0,170,0,1)',
  ACTIVE: 'rgba(120,255,0,1)',
  PASSIVE: 'rgba(204,204,255,1)',
  NONE: 'rgba(0,0,0,0)',
} as const;

/**
 * Return the rgba color for a given state string.
 */
export function getStateColor(
  value: string
): (typeof StateColors)[keyof typeof StateColors] {
  let state: State;

  try {
    state = new State(value);
  } catch {
    return StateColors.NONE;
  }

  let colorState: State = State.UNKNOWN;

  if (state.isDerivedFrom(State.CHANGING)) {
    colorState = State.CHANGING;
  } else if (state.isDerivedFrom(State.RUNNING)) {
    colorState = State.RUNNING;
  } else if (state.isDerivedFrom(State.ACTIVE)) {
    colorState = State.ACTIVE;
  } else if (state.isDerivedFrom(State.PASSIVE)) {
    colorState = State.PASSIVE;
  } else if (state.isDerivedFrom(State.DISABLED)) {
    colorState = State.DISABLED;
  } else if (
    state === State.STATIC ||
    state === State.NORMAL ||
    state === State.ERROR ||
    state === State.INIT
  ) {
    colorState = state;
  }

  return StateColors[colorState.name as keyof typeof StateColors];
}

export default getStateColor;
