import { AccessLevel } from '@/karabo_data/SchemaEnums';

/**
 * CRUD-based permission capabilities per access level
 *
 * Observer (Read-only):
 *   - read: true
 *   - create: false
 *   - update: false
 *   - delete: false
 *
 * Operator (Full CRUD):
 *   - read: true
 *   - create: true (execute commands, create new configurations)
 *   - update: true (edit properties, reconfigure devices)
 *   - delete: true (delete configurations, stop processes)
 *
 * Expert (Full CRUD):
 *   - Same as Operator
 */
export interface AccessLevelPermissions {
  read: boolean; // View/display data
  create: boolean; // Create new items, execute commands
  update: boolean; // Edit/modify existing properties
  delete: boolean; // Delete items, stop processes
  canChangeAccessLevel: boolean; // Change own access level (special permission)
}

/**
 * Get CRUD permission capabilities for a given access level
 *
 * @param accessLevel - The access level to check (0=Observer, 1=Operator, 2=Expert)
 * @returns AccessLevelPermissions object with CRUD flags
 */
export function getAccessLevelPermissions(
  accessLevel?: number
): AccessLevelPermissions {
  const level = accessLevel ?? AccessLevel.Observer;

  // Observer: Read-only
  if (level === AccessLevel.Observer) {
    return {
      read: true,
      create: false,
      update: false,
      delete: false,
      canChangeAccessLevel: false,
    };
  }

  // Operator and Expert: Full CRUD
  return {
    read: true,
    create: true,
    update: true,
    delete: true,
    canChangeAccessLevel: true,
  };
}

/**
 * Check if a user can change TO a specific access level
 * Rules:
 * - Observer: Cannot change level at all
 * - Operator: Can change to Observer, Operator, or Expert
 * - Expert: Can change to Observer, Operator, or Expert
 *
 * @param currentLevel - The user's current access level
 * @param targetLevel - The access level the user wants to change to
 * @returns true if the user can change to the target level
 */
export function canChangeToAccessLevel(
  currentLevel: number | undefined,
  targetLevel: AccessLevel
): boolean {
  const current = currentLevel ?? AccessLevel.Observer;

  // Observer cannot change access level at all
  if (current === AccessLevel.Observer) {
    return false;
  }

  // Operator and Expert can change to any valid level (Observer, Operator, Expert)
  const validTargetLevels = [
    AccessLevel.Observer,
    AccessLevel.Operator,
    AccessLevel.Expert,
  ];
  return (
    current >= AccessLevel.Operator && validTargetLevels.includes(targetLevel)
  );
}

/**
 * Get available access levels a user can switch to
 */
export function getAvailableAccessLevels(
  currentLevel: number | undefined
): AccessLevel[] {
  const current = currentLevel ?? AccessLevel.Observer;

  // Observer cannot change level
  if (current === AccessLevel.Observer) {
    return [];
  }

  // Operator and Expert can switch to any level
  return [AccessLevel.Observer, AccessLevel.Operator, AccessLevel.Expert];
}
