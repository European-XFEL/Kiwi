// State.test.ts
import { State } from '../State';

describe('State Enum Class', () => {
  // 1. Identity & Singleton Behavior
  describe('Singleton Identity', () => {
    test('Static property and string lookup return the exact same instance', () => {
      const fromStatic = State.RUNNING;
      const fromString = new State('RUNNING');

      expect(fromStatic).toBe(fromString);
      expect(fromStatic).toBe(State.RUNNING);
    });

    test('Multiple lookups return the same instance', () => {
      const a = new State('ACTIVE');
      const b = new State('ACTIVE');
      expect(a).toBe(b);
    });
  });

  // 2. Fixed Set Enforcement
  describe('Fixed Set Enforcement', () => {
    test('Throws error when trying to create/lookup a non-existent state', () => {
      expect(() => {
        new State('NON_EXISTENT_STATE');
      }).toThrow("Invalid State: 'NON_EXISTENT_STATE' is not a valid State.");
    });
  });

  // 3. Hierarchy Logic
  describe('Hierarchy (isDerivedFrom)', () => {
    // Rule: Child.isDerivedFrom(Parent) === true

    test('Self is derived from Self', () => {
      expect(State.RUNNING.isDerivedFrom(State.RUNNING)).toBe(true);
    });

    test('Direct parent relationship (Child is derived from Parent)', () => {
      // Definition: MOVING_UP = create(..., INCREASING)
      // Child: MOVING_UP, Parent: INCREASING
      expect(State.MOVING_UP.isDerivedFrom(State.INCREASING)).toBe(true);
    });

    test('Grandparent relationship (Deep ancestry)', () => {
      // Chain: MOVING_UP -> INCREASING -> CHANGING -> NORMAL -> KNOWN
      // The Specific (Child) is derived from the General (Ancestor)
      expect(State.MOVING_UP.isDerivedFrom(State.CHANGING)).toBe(true);
      expect(State.MOVING_UP.isDerivedFrom(State.NORMAL)).toBe(true);
      expect(State.MOVING_UP.isDerivedFrom(State.KNOWN)).toBe(true);
    });

    test('Unrelated states return false', () => {
      // ERROR is not in the ancestry of MOVING_UP
      expect(State.MOVING_UP.isDerivedFrom(State.ERROR)).toBe(false);
    });

    test('Parent is NOT derived from Child (Directionality)', () => {
      // INCREASING is the parent (General), MOVING_UP is the child (Specific)
      // The General is NOT derived from the Specific.
      expect(State.INCREASING.isDerivedFrom(State.MOVING_UP)).toBe(false);
    });

    test('Root handling', () => {
      // UNKNOWN has no parent
      expect(State.UNKNOWN.parent).toBeNull();
      // KNOWN is a root, it cannot be derived from UNKNOWN (they are siblings/distinct roots)
      expect(State.KNOWN.isDerivedFrom(State.UNKNOWN)).toBe(false);
    });
  });

  // 4. Specific Karabo Logic Verification
  describe('Specific Domain Logic', () => {
    test('Verify INTERLOCKED is derived from DISABLED', () => {
      // Child: INTERLOCKED, Parent: DISABLED
      expect(State.INTERLOCKED.isDerivedFrom(State.DISABLED)).toBe(true);
    });

    test('Verify ACQUIRING is derived from RUNNING', () => {
      // Child: ACQUIRING, Parent: RUNNING
      expect(State.ACQUIRING.isDerivedFrom(State.RUNNING)).toBe(true);
    });

    test('Verify HEATING is derived from INCREASING', () => {
      // Child: HEATING, Parent: INCREASING
      expect(State.HEATING.isDerivedFrom(State.INCREASING)).toBe(true);
    });
  });

  // 5. Serialization
  describe('Serialization', () => {
    test('toString returns the name', () => {
      expect(State.ON.toString()).toBe('ON');
      expect(`${State.ON}`).toBe('ON');
    });

    test('JSON.stringify uses the name', () => {
      const data = {
        device: 'Motor',
        state: State.MOVING_UP,
      };
      // Should serialize to string "MOVING_UP", not a complex object
      expect(JSON.stringify(data)).toContain('"state":"MOVING_UP"');
    });
  });
});
