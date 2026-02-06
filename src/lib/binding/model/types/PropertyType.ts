import type { HashTypes } from '@/karabo-hash/typenums';
import type { HashValues } from '@/karabo-hash/hash';
import type { PropertySchema } from './SchemaType';
import type { Timestamp } from '@/lib/binding/utils/timestamps';
import type { PropertyInfo } from '@/karabo_data/DeviceConfigInfo';

// Any value a property can hold.
export type PropertyValue = HashValues | undefined;

export type PropertyChangeHandler = (
  value: PropertyValue | undefined,
  timestamp?: Timestamp
) => void;

export interface BindingInterface {
  value: PropertyValue | undefined;
  type: HashTypes | undefined | string;
  timestamp?: Timestamp;
  timeAttrs?: Record<string, unknown>;
  info?: PropertyInfo;

  getValue(): PropertyValue | undefined;
  setValue(
    value: PropertyValue,
    options?: {
      timestamp?: Timestamp;
    }
  ): void;

  onChange(handler: PropertyChangeHandler): () => void;
}

/**
 * Full property model: static definition + live state.
 */
export interface PropertyModel {
  schema: PropertySchema;
  binding: BindingInterface;
}
