// Create a unique symbol that is not exported.
// This acts as a private key that only this module can access.
const __INTERNAL_STATE__ = Symbol('____INTERNAL_STATE____');

export class State {
  private static readonly _registry = new Map<string, State>();

  public readonly name!: string;
  public readonly parent!: State | null;

  // The constructor is public to allow "lookup" via new State('NAME'),
  // but prevents creation of *new* states unless the internal symbol is passed.
  constructor(
    name: string,
    parentOrKey?: State | null | typeof __INTERNAL_STATE__
  ) {
    // 1. If we are NOT using the internal key, we are looking up an existing state
    if (parentOrKey !== __INTERNAL_STATE__) {
      const existing = State._registry.get(name);
      if (!existing) {
        throw new Error(`Invalid State: '${name}' is not a valid State.`);
      }
      return existing;
    }

    // 2. If we ARE using the internal key, we are creating a fresh definition
    this.name = name;

    // Note: The 'create' static method handles setting the parent property
    // immediately after instantiation to satisfy the readonly requirement
    // while keeping the constructor signature flexible.
    this.parent = null;
  }

  // Helper to construct the hierarchy safely
  private static create(name: string, parent: State | null): State {
    // Pass the secret symbol to allow instantiation
    const instance = new State(name, __INTERNAL_STATE__ as any);

    // We cast to any to write to the 'readonly' parent property during creation
    (instance as any).parent = parent;

    State._registry.set(name, instance);
    return instance;
  }

  /**
   * Checks if THIS state is a child/descendant of the OTHER state.
   * Example: MOVING_UP.isDerivedFrom(INCREASING) === true
   */
  public isDerivedFrom(other: State): boolean {
    // Start checking from THIS state
    let current: State | null = this;

    // Walk up the tree until we hit the top (null)
    while (current !== null) {
      // If we find 'other' in our ancestry, return true
      if (current === other) return true;
      current = current.parent;
    }

    return false;
  }

  public toString(): string {
    return this.name;
  }

  public toJSON(): string {
    return this.name;
  }

  // =========================================================
  // DEFINITIONS
  // =========================================================

  // --- Roots ---
  public static readonly UNKNOWN = State.create('UNKNOWN', null);
  public static readonly KNOWN = State.create('KNOWN', null);
  public static readonly INIT = State.create('INIT', null);

  // --- Level 1 (Children of KNOWN) ---
  public static readonly ERROR = State.create('ERROR', State.KNOWN);
  public static readonly DISABLED = State.create('DISABLED', State.KNOWN);
  public static readonly NORMAL = State.create('NORMAL', State.KNOWN);

  // --- Level 2 (Children of DISABLED) ---
  public static readonly INTERLOCKED = State.create(
    'INTERLOCKED',
    State.DISABLED
  );
  public static readonly PAUSED = State.create('PAUSED', State.DISABLED);
  public static readonly INTERLOCK_BROKEN = State.create(
    'INTERLOCK_BROKEN',
    State.DISABLED
  );

  // --- Level 2 (Children of NORMAL) ---
  public static readonly STATIC = State.create('STATIC', State.NORMAL);
  public static readonly CHANGING = State.create('CHANGING', State.NORMAL);
  public static readonly RUNNING = State.create('RUNNING', State.NORMAL);

  // --- Level 3 (Children of STATIC) ---
  public static readonly INTERLOCK_OK = State.create(
    'INTERLOCK_OK',
    State.STATIC
  );
  public static readonly PASSIVE = State.create('PASSIVE', State.STATIC);
  public static readonly ACTIVE = State.create('ACTIVE', State.STATIC);

  // --- Level 3 (Children of CHANGING) ---
  public static readonly DECREASING = State.create(
    'DECREASING',
    State.CHANGING
  );
  public static readonly INCREASING = State.create(
    'INCREASING',
    State.CHANGING
  );

  public static readonly HOMING = State.create('HOMING', State.CHANGING);
  public static readonly ROTATING = State.create('ROTATING', State.CHANGING);
  public static readonly MOVING = State.create('MOVING', State.CHANGING);
  public static readonly SWITCHING = State.create('SWITCHING', State.CHANGING);
  public static readonly OPENING = State.create('OPENING', State.CHANGING);
  public static readonly CLOSING = State.create('CLOSING', State.CHANGING);
  public static readonly SEARCHING = State.create('SEARCHING', State.CHANGING);

  // --- Level 3 (Children of RUNNING) ---
  public static readonly ACQUIRING = State.create('ACQUIRING', State.RUNNING);
  public static readonly PROCESSING = State.create('PROCESSING', State.RUNNING);

  // --- Level 4 (Children of DECREASING) ---
  public static readonly COOLING = State.create('COOLING', State.DECREASING);
  public static readonly MOVING_LEFT = State.create(
    'MOVING_LEFT',
    State.DECREASING
  );
  public static readonly MOVING_DOWN = State.create(
    'MOVING_DOWN',
    State.DECREASING
  );
  public static readonly MOVING_BACK = State.create(
    'MOVING_BACK',
    State.DECREASING
  );
  public static readonly ROTATING_CNTCLK = State.create(
    'ROTATING_CNTCLK',
    State.DECREASING
  );
  public static readonly RAMPING_DOWN = State.create(
    'RAMPING_DOWN',
    State.DECREASING
  );
  public static readonly EXTRACTING = State.create(
    'EXTRACTING',
    State.DECREASING
  );
  public static readonly STOPPING = State.create('STOPPING', State.DECREASING);
  public static readonly EMPTYING = State.create('EMPTYING', State.DECREASING);
  public static readonly DISENGAGING = State.create(
    'DISENGAGING',
    State.DECREASING
  );
  public static readonly SWITCHING_OFF = State.create(
    'SWITCHING_OFF',
    State.DECREASING
  );

  // --- Level 4 (Children of INCREASING) ---
  public static readonly HEATING = State.create('HEATING', State.INCREASING);
  public static readonly MOVING_RIGHT = State.create(
    'MOVING_RIGHT',
    State.INCREASING
  );
  public static readonly MOVING_UP = State.create(
    'MOVING_UP',
    State.INCREASING
  );
  public static readonly MOVING_FORWARD = State.create(
    'MOVING_FORWARD',
    State.INCREASING
  );
  public static readonly ROTATING_CLK = State.create(
    'ROTATING_CLK',
    State.INCREASING
  );
  public static readonly RAMPING_UP = State.create(
    'RAMPING_UP',
    State.INCREASING
  );
  public static readonly INSERTING = State.create(
    'INSERTING',
    State.INCREASING
  );
  public static readonly STARTING = State.create('STARTING', State.INCREASING);
  public static readonly FILLING = State.create('FILLING', State.INCREASING);
  public static readonly ENGAGING = State.create('ENGAGING', State.INCREASING);
  public static readonly SWITCHING_ON = State.create(
    'SWITCHING_ON',
    State.INCREASING
  );

  // --- Level 4 (Children of PASSIVE) ---
  public static readonly WARM = State.create('WARM', State.PASSIVE);
  public static readonly COLD = State.create('COLD', State.PASSIVE);
  public static readonly PRESSURIZED = State.create(
    'PRESSURIZED',
    State.PASSIVE
  );
  public static readonly CLOSED = State.create('CLOSED', State.PASSIVE);
  public static readonly OFF = State.create('OFF', State.PASSIVE);
  public static readonly INSERTED = State.create('INSERTED', State.PASSIVE);
  public static readonly STOPPED = State.create('STOPPED', State.PASSIVE);
  public static readonly UNLOCKED = State.create('UNLOCKED', State.PASSIVE);
  public static readonly DISENGAGED = State.create('DISENGAGED', State.PASSIVE);
  public static readonly IGNORING = State.create('IGNORING', State.PASSIVE);

  // --- Level 4 (Children of ACTIVE) ---
  public static readonly COOLED = State.create('COOLED', State.ACTIVE);
  public static readonly HEATED = State.create('HEATED', State.ACTIVE);
  public static readonly EVACUATED = State.create('EVACUATED', State.ACTIVE);
  public static readonly OPENED = State.create('OPENED', State.ACTIVE);
  public static readonly ON = State.create('ON', State.ACTIVE);
  public static readonly EXTRACTED = State.create('EXTRACTED', State.ACTIVE);
  public static readonly STARTED = State.create('STARTED', State.ACTIVE);
  public static readonly LOCKED = State.create('LOCKED', State.ACTIVE);
  public static readonly ENGAGED = State.create('ENGAGED', State.ACTIVE);
  public static readonly MONITORING = State.create('MONITORING', State.ACTIVE);
}
