import type { DeviceProxy } from './DeviceProxy';
import type { PropertyModel } from '../device-model/types/PropertyType';
import type { HashValueType } from '@/karabo_hash/HashValueType';
import type { Attributes } from 'karabo-ts';
import {
  buildPropertyDescriptor,
  type PropertyDescriptor,
} from './PropertyDescriptor';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { EditContext } from '../device-model/editability';
import { AccessLevel } from '@/karabo_data/SchemaEnums';

/**
 * Convenience wrapper for a single property of a DeviceProxy.
 * Good for React hooks or widgets that deal with a single path.
 */
export class PropertyProxy {
  constructor(
    private readonly root: DeviceProxy,
    public readonly path: string
  ) {}

  /** Full key/path, e.g. "name", "frequency", "channels" */
  get key(): string {
    return this.path;
  }

  /** Underlying property model (schema + value + timeAttrs) */
  get model(): PropertyModel | undefined {
    return this.root.getProperty(this.path);
  }

  /** Schema (PropertySchema) */
  get schema() {
    return this.model?.property_schema;
  }

  /** Build the EditContext for permission checks */
  private get editContext(): EditContext {
    const userAccessLevel =
      useGlobalStore.getState().sessionInfo?.accessLevel ??
      AccessLevel.Observer;

    const deviceState = this.root.state; // undefined if not set, otherwise actual state

    return {
      userAccessLevel,
      deviceState,
    };
  }

  /** UI-friendly descriptor (includes schema + helpers) */
  get descriptor(): PropertyDescriptor | undefined {
    const m = this.model;
    return m ? buildPropertyDescriptor(m, this.editContext) : undefined;
  }

  /** Current value */
  get value(): HashValueType | undefined {
    return this.model?.value;
  }

  /** Timestamp / attributes */
  get timeAttrs(): Attributes | undefined {
    return this.model?.timeAttrs;
  }

  /**
   * Subscribe to value changes of this property only.
   * Returns an unsubscribe function.
   */
  subscribe(
    callback: (value: HashValueType, timeAttrs: Attributes) => void
  ): () => void {
    return this.root.subscribeToProperty(this.path, callback);
  }

  /**
   * Small convenience: is this property editable?
   * Later you can extend this to check:
   * - requiredAccessLevel
   * - allowedStates vs current device state
   */
  get isEditable(): boolean {
    const schemaAttrs = this.schema?.schemaAttrs;
    if (!schemaAttrs) return false;

    // AccessMode.Reconfigurable = 4
    return schemaAttrs.accessMode === 4;
  }

  /** Convenience shortcuts from descriptor (optional but nice) */
  get displayedName(): string | undefined {
    return this.descriptor?.displayedName ?? this.key;
  }

  get unitLabel(): string | undefined {
    return this.descriptor?.unitLabel;
  }
}
