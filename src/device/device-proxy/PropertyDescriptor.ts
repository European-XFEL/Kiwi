import type { PropertyModel } from '@/device/device-model/types/PropertyType';
import type { PropertySchemaAttributes } from '@/karabo_data/DeviceSchemaInfo';
import { AccessLevel } from '@/karabo_data/SchemaEnums';
import { useGlobalStore } from '@/store/globalAppStateStore';
import {
  isPropertyEditable,
  type EditContext,
} from '@/device/device-model/editability';

export interface PropertyDescriptor {
  /** Full property path, e.g. "name", "frequency", "channels" */
  path: string;

  /** UI label: displayedName or path */
  displayedName: string;

  description?: string;
  unitLabel?: string;

  /** Raw schema attributes, kept for deeper UI logic if needed */
  schemaAttrs: PropertySchemaAttributes;

  /** Can the user edit this property *right now*? */
  isEditable: boolean;
}

/**
 * Build a PropertyDescriptor from a PropertyModel + edit context.
 *
 * The context is where we inject:
 *  - current user access level
 *  - current device state (ACTIVE, PASSIVE, MOVING, ...)
 */
export function buildPropertyDescriptor(
  model: PropertyModel,
  ctx: EditContext
): PropertyDescriptor {
  const { schema } = model;
  const schemaAttrs = schema.schemaAttrs;

  const { displayedName, description, unitSymbol, metricPrefixSymbol } =
    schemaAttrs;

  const unitLabel =
    `${metricPrefixSymbol ?? ''}${unitSymbol ?? ''}`.trim() || undefined;

  const isEditableFlag = isPropertyEditable(schemaAttrs, ctx);

  return {
    path: schema.path,
    displayedName: displayedName || schema.path,
    description,
    unitLabel,
    schemaAttrs,
    isEditable: isEditableFlag,
  };
}

/**
 * Convenience helper if you *don’t* want to manually build the EditContext:
 * pulls userAccessLevel from global store.
 */
export function buildDescriptorWithGlobalContext(
  model: PropertyModel,
  deviceState: string | undefined
): PropertyDescriptor {
  const userAccessLevel =
    useGlobalStore.getState().sessionInfo?.accessLevel ?? AccessLevel.Observer;

  const ctx: EditContext = {
    userAccessLevel,
    deviceState: deviceState ?? 'UNKNOWN',
  };

  return buildPropertyDescriptor(model, ctx);
}
