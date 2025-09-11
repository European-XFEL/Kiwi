export enum RawGuiState {
  Unknown       = "UNKNOWN_COLOR",
  KnownNormal   = "KNOWN_NORMAL_COLOR",
  Init          = "INIT_COLOR",
  Disabled      = "DISABLED_COLOR",
  Error         = "ERROR_COLOR",
  Changing      = "CHANGING_DECREASING_INCREASING_COLOR",
  Running       = "RUNNING_COLOR",
  Static        = "STATIC_COLOR",
  Active        = "ACTIVE_COLOR",
  Passive       = "PASSIVE_COLOR",
}

export const guiStateColors = {
  unknownColor: "rgba(255,170,0,1)",
  knownNormalColor: "rgba(200,200,200,1)",
  initColor: "rgba(230,230,170,1)",
  disabledColor: "rgba(255,0,255,1)",
  errorColor: "rgba(255,0,0,1)",
  changingColor: "rgba(0,170,255,1)", // changing color (decreasing or increasing)
  runningColor: "rgba(153,204,255,1)",
  staticColor: "rgba(0,170,0,1)",
  activeColor: "rgba(120,255,0,1)",
  passiveColor: "rgba(204,204,255,1)",
} as const;


export const CHANGING = new Set([
  "CHANGING",
  "INCREASING",
  "DECREASING",
  "HOMING",
  "ROTATING",
  "MOVING",
  "SWITCHING",
  "OPENING",
  "CLOSING",
  "SEARCHING",
  "HEATING",
  "COOLING",
  "MOVING_LEFT",
  "MOVING_RIGHT",
  "MOVING_UP",
  "MOVING_DOWN",
  "MOVING_BACK",
  "MOVING_FORWARD",
  "ROTATING_CLK",
  "ROTATING_CNTCLK",
  "RAMPING_UP",
  "RAMPING_DOWN",
  "INSERTING",
  "EXTRACTING",
  "STARTING",
  "STOPPING",
  "ENGAGING",
  "DISENGAGING",
  "SWITCHING_ON",
  "SWITCHING_OFF",
]);

export const RUNNING = new Set(["RUNNING", "ACQUIRING", "PROCESSING"]);

export const ACTIVE = new Set([
  "ACTIVE",
  "COOLED",
  "HEATED",
  "EVACUATED",
  "OPENED",
  "ON",
  "EXTRACTED",
  "STARTED",
  "LOCKED",
  "ENGAGED",
  "MONITORING",
  "INTERLOCK_OK",
]);

export const PASSIVE = new Set([
  "PASSIVE",
  "WARM",
  "COLD",
  "PRESSURIZED",
  "CLOSED",
  "OFF",
  "INSERTED",
  "STOPPED",
  "UNLOCKED",
  "DISENGAGED",
  "IGNORING",
]);


export const DISABLED = new Set(["DISABLED", "PAUSED", "INTERLOCK_BROKEN"]);

// Exact matches used in Python’s `elif state in [STATIC, NORMAL, ERROR, INIT]`
export const EXACT_TO_COLOR: Record<string, GuiStateColorKey> = {
  STATIC: "staticColor",
  NORMAL: "knownNormalColor",
  ERROR: "errorColor",
  INIT: "initColor",
  KNOWN: "knownNormalColor", // Python maps KNOWN and NORMAL to same color
};


//now we have a single source truth for state colors
export type GuiStateColorKey = keyof typeof guiStateColors;


