import type { DeviceProxy } from './DeviceProxy';
import type { PropertyModel, ProxyValue } from '../model/types/PropertyType';
import type { HashAttributes, HashValues } from '@/karabo-hash/hash';

/**
 * Thin convenience wrapper for a single property of a DeviceProxy.
 *
 * IMPORTANT:
 * - No React/store/UI logic here (no useGlobalStore, no descriptors).
 * - Subscriptions are still *created by the hook*; this just delegates to DeviceProxy.
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

  /** Current value */
  get value(): ProxyValue | undefined {
    return this.model?.binding.getValue();
  }

  /** Raw time attributes from the binding */
  get timeAttrs(): HashAttributes | undefined {
    return this.model?.binding.timeAttrs as HashAttributes | undefined;
  }

  /**
   * Subscribe to value changes of this property only.
   * Returns an unsubscribe function.
   */
  subscribe(
    callback: (value: HashValues, timeAttrs: HashAttributes) => void
  ): () => void {
    return this.root.subscribeToProperty(this.path, callback);
  }

  /** Minimal local write helper */
  setValue(next: ProxyValue): void {
    const m = this.model;
    if (!m) return;
    m.binding.setValue(next);
  }
}
