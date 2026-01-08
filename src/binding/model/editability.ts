import type { PropertySchemaAttributes } from '@/karabo_data/DeviceSchemaInfo';
import { AccessLevel, AccessMode } from '@/karabo_data/SchemaEnums';

export interface EditContext {
  userAccessLevel: AccessLevel;
  deviceState: string | undefined; // raw Karabo state, e.g. "ACTIVE", "PASSIVE", "MOVING", or undefined if not set
}

function compareAccessLevel(
  user: AccessLevel,
  required?: AccessLevel
): boolean {
  if (required === undefined) return true; // no requirement → ok
  return user >= required; // relies on enum ordering Observer < Operator < Expert
}

export function isPropertyEditable(
  attrs: PropertySchemaAttributes,
  ctx: EditContext
): boolean {
  // 1. nodeType: only edit leaf properties
  if (
    attrs.nodeType !== undefined &&
    attrs.nodeType !== 0 /* NodeType.LEAF */
  ) {
    return false;
  }

  // 2. accessMode must allow reconfiguration
  if (
    attrs.accessMode === AccessMode.ReadOnly ||
    attrs.accessMode === AccessMode.InitOnly
  ) {
    return false;
  }

  // 3. user access level
  if (!compareAccessLevel(ctx.userAccessLevel, attrs.requiredAccessLevel)) {
    return false;
  }

  // 4. device state vs allowedStates (if provided)
  if (attrs.allowedStates && attrs.allowedStates.length > 0) {
    // If deviceState is undefined, treat as not matching any allowed states
    if (!ctx.deviceState) return false;
    const current = ctx.deviceState.trim().toUpperCase();
    const allowed = attrs.allowedStates.map((s) => s.trim().toUpperCase());
    if (!allowed.includes(current)) return false;
  }

  return true;
}
