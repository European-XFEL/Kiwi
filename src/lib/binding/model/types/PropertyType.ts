import type { HashTypes } from '@/karabo-hash/typenums';
import type { HashValues } from '@/karabo-hash/hash';
import type { PropertySchema } from './SchemaType';
import type { Timestamp } from '@/lib/binding/utils/timestamps';

// Any value a proxy can hold.
export type ProxyValue = HashValues | undefined;

export interface BindingInterface {
  value: ProxyValue | undefined;
  type: HashTypes | undefined | string;
  timestamp?: Timestamp;
  timeAttrs?: Record<string, unknown>;

  getValue(): ProxyValue | undefined;
  setValue(
    value: ProxyValue,
    options?: {
      timestamp?: Timestamp;
    }
  ): void;
}

/**
 * Full property model: static definition + live state.
 */
export interface PropertyModel {
  schema: PropertySchema;
  binding: BindingInterface;
}
