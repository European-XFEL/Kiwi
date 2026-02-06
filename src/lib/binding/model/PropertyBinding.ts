import type { HashTypes } from '@/karabo-hash/typenums';
import type {
  PropertyValue,
  PropertyChangeHandler,
  BindingInterface,
} from './types/PropertyType';
import { Timestamp } from '@/lib/binding/utils/timestamps';
import type { PropertyInfo } from '@/karabo_data/DeviceConfigInfo';

export class PropertyBinding implements BindingInterface {
  value: PropertyValue | undefined;
  type: HashTypes | undefined | string;
  timestamp?: Timestamp;
  timeAttrs?: Record<string, unknown>;
  info?: PropertyInfo;

  private changeHandlers = new Set<PropertyChangeHandler>();

  constructor(initial?: {
    value?: PropertyValue;
    type?: HashTypes | string;
    timestamp?: Timestamp;
    timeAttrs?: Record<string, unknown>;
  }) {
    this.value = initial?.value;
    this.type = initial?.type;
    this.timestamp = initial?.timestamp;
    this.timeAttrs = initial?.timeAttrs;
  }

  getValue(): PropertyValue | undefined {
    return this.value;
  }

  setValue(
    value: PropertyValue,
    options?: {
      timestamp?: Timestamp;
    }
  ): void {
    const timestamp = options?.timestamp ?? Timestamp.now();
    this.value = value;
    this.timestamp = timestamp;
  }

  onChange(handler: PropertyChangeHandler): () => void {
    this.changeHandlers.add(handler);
    return () => {
      this.changeHandlers.delete(handler);
    };
  }
}
