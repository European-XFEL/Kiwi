import type { DeviceProxy } from './DeviceProxy';
import type { PropertyModel, PropertyValue } from '../model/types/PropertyType';
import type { HashValueType } from '@/karabo_hash/HashValueType';
import type { Attributes } from 'karabo-ts';

import {
  buildPropertyDescriptor,
  type PropertyDescriptor,
} from './PropertyDescriptor';

import { useGlobalStore } from '@/store/globalAppStateStore';
import { EditContext } from '../model/editability';
import { AccessLevel } from '@/karabo_data/SchemaEnums';

/**
 * Convenience wrapper for a single property of a DeviceProxy.
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

  /** Underlying property model (schema + binding) */
  get model(): PropertyModel | undefined {
    return this.root.getProperty(this.path);
  }

  /** Schema (PropertySchema) */
  get schema() {
    return this.model?.schema;
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

  /** Current value (typed as PropertyValue for core, HashValueType for UI) */
  get value(): PropertyValue {
    return this.model?.binding.getValue();
  }

  /** Same value but narrowed for legacy widgets that expect HashValueType */
  get hashValue(): HashValueType | undefined {
    return this.value as HashValueType | undefined;
  }

  /** Timestamp / attributes */
  get timeAttrs(): Attributes | undefined {
    // we still store raw timeAttrs on the binding
    return this.model?.binding.timeAttrs as Attributes | undefined;
  }

  /**
   * Subscribe to value changes of this property only.
   * Returns an unsubscribe function.
   *
   * Note: still delegates to DeviceProxy’s event system.
   */
  subscribe(
    callback: (value: HashValueType, timeAttrs: Attributes) => void
  ): () => void {
    return this.root.subscribeToProperty(this.path, callback);
  }

  /**
   * Minimal write helper: set a new value via the binding.
   * For now this is local-only; later you can have this call
   * a DeviceManager / command to talk to the backend.
   */
  setValue(next: PropertyValue): void {
    const m = this.model;
    if (!m) return;

    m.binding.setValue(next);
  }

  /**
   * Small convenience: is this property editable?
   * Right now only checks accessMode; later you can extend with:
   *  - requiredAccessLevel vs userAccessLevel
   *  - allowedStates vs current device state
   */
  get isEditable(): boolean {
    const schemaAttrs = this.schema?.schemaAttrs;
    if (!schemaAttrs) return false;

    // AccessMode.Reconfigurable = 4 (your existing convention)
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
