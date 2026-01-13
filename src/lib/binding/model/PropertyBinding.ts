/**
 * PropertyBinding - Runtime state and data for a property
 */

import type { HashTypes } from 'karabo-ts';
import type {
  PropertyBinding as IPropertyBinding,
  PropertyValue,
  HistoricSample,
  PropertyChangeHandler,
  HistoricDataHandler,
} from './types/PropertyType';
import { Timestamp } from '@/lib/binding/utils/timestamps';
import type { PropertyInfo } from '@/karabo_data/DeviceConfigInfo';

export class PropertyBinding implements IPropertyBinding {
  // -------------------------------------------------------------------------
  // Data (the important stuff - accessed directly)
  // -------------------------------------------------------------------------

  value: PropertyValue | undefined;
  type: HashTypes | undefined | string;
  timestamp?: Timestamp;
  timeAttrs?: Record<string, unknown>;
  info?: PropertyInfo;
  //develop some data logging communication
  historicData: HistoricSample[] = [];

  // -------------------------------------------------------------------------
  // Internal subscribers
  // -------------------------------------------------------------------------

  private changeHandlers = new Set<PropertyChangeHandler>();
  private historicHandlers = new Set<HistoricDataHandler>();

  // -------------------------------------------------------------------------
  // Constructor - just set the data
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Simple data access
  // -------------------------------------------------------------------------

  getValue(): PropertyValue | undefined {
    return this.value;
  }

  getTimestamp(): string | undefined {
    return this.timestamp?.toISOString();
  }

  getState() {
    return {
      value: this.value,
      type: this.type,
      timestamp: this.timestamp,
      timeAttrs: this.timeAttrs,
      info: this.info,
      historicData: this.historicData,
    };
  }

  toJSON() {
    return this.getState();
  }

  // -------------------------------------------------------------------------
  // Value changes
  // -------------------------------------------------------------------------

  setValue(
    value: PropertyValue,
    options?: {
      timestamp?: Timestamp;
    }
  ): void {
    const timestamp = options?.timestamp ?? Timestamp.now();

    this.value = value;
    this.timestamp = timestamp;

    this.notifyChangeHandlers(value, timestamp);
  }

  reset(): void {
    this.value = undefined;
    this.timestamp = undefined;
    this.timeAttrs = undefined;

    const timestamp = Timestamp.now();
    this.notifyChangeHandlers(undefined, timestamp);
  }

  // -------------------------------------------------------------------------
  // Historic data handling
  // -------------------------------------------------------------------------

  setHistoricData(data: HistoricSample[]): void {
    this.historicData = data;
    this.notifyHistoricHandlers();
  }

  // -------------------------------------------------------------------------
  // Subscriptions
  // -------------------------------------------------------------------------

  onChange(handler: PropertyChangeHandler): () => void {
    this.changeHandlers.add(handler);
    return () => {
      this.changeHandlers.delete(handler);
    };
  }

  onHistoricData(handler: HistoricDataHandler): () => void {
    this.historicHandlers.add(handler);
    return () => {
      this.historicHandlers.delete(handler);
    };
  }

  // -------------------------------------------------------------------------
  // Utility
  // -------------------------------------------------------------------------

  destroy(): void {
    this.changeHandlers.clear();
    this.historicHandlers.clear();
  }

  // -------------------------------------------------------------------------
  // Internal notifier helpers
  // -------------------------------------------------------------------------

  private notifyChangeHandlers(
    value: PropertyValue | undefined,
    timestamp?: Timestamp
  ) {
    if (this.changeHandlers.size === 0) return;
    for (const handler of this.changeHandlers) {
      handler(value, timestamp);
    }
  }

  private notifyHistoricHandlers() {
    if (this.historicHandlers.size === 0) return;
    const snapshot = [...this.historicData];
    for (const handler of this.historicHandlers) {
      handler(snapshot);
    }
  }
}

/**
 * Helper to create a PropertyBinding instance
 */
export function createPropertyBinding(initial?: {
  value?: PropertyValue;
  type?: HashTypes | string;
  timestamp?: Timestamp;
  timeAttrs?: Record<string, unknown>;
}): PropertyBinding {
  return new PropertyBinding(initial);
}
