import type { HashTypes } from '@/karabo-hash/typenums';
import type { ProxyValue, BindingInterface } from './types/PropertyType';
import { Timestamp } from '@/lib/binding/utils/timestamps';

export class PropertyBinding implements BindingInterface {
  value: ProxyValue | undefined;
  type: HashTypes | undefined | string;
  timestamp?: Timestamp;
  timeAttrs?: Record<string, unknown>;

  constructor(initial?: {
    value?: ProxyValue;
    type?: HashTypes | string;
    timestamp?: Timestamp;
    timeAttrs?: Record<string, unknown>;
  }) {
    this.value = initial?.value;
    this.type = initial?.type;
    this.timestamp = initial?.timestamp;
    this.timeAttrs = initial?.timeAttrs;
  }

  getValue(): ProxyValue | undefined {
    return this.value;
  }

  setValue(
    value: ProxyValue,
    options?: {
      timestamp?: Timestamp;
    }
  ): void {
    const timestamp = options?.timestamp ?? Timestamp.now();
    this.value = value;
    this.timestamp = timestamp;
  }
}
