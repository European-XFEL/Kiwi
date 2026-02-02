/**
 * Property Model
 *
 * Separates static schema (what a property IS) from runtime binding (what it's DOING).
 */

import type { HashTypes } from '@/karabo-hash/typenums';
import type { HashValues } from '@/karabo-hash/hash';
import type { PropertySchema } from './SchemaType';
import type { Timestamp } from '@/lib/binding/utils/timestamps';
import type { PropertyInfo } from '@/karabo_data/DeviceConfigInfo';

// Any value a property can hold.
export type PropertyValue = HashValues | undefined;

// A single historic sample: value at a given time.
export interface HistoricSample {
  timestamp: Timestamp;
  value: PropertyValue;
}

export type PropertyChangeHandler = (
  value: PropertyValue | undefined,
  timestamp?: Timestamp
) => void;

export type HistoricDataHandler = (data: HistoricSample[]) => void;

/**
 * Runtime state of a property + minimal API.
 */
export interface PropertyBinding {
  value: PropertyValue | undefined;
  type: HashTypes | undefined | string;
  timestamp?: Timestamp;
  timeAttrs?: Record<string, unknown>;
  info?: PropertyInfo;

  // Placeholder for future data logging API.
  historicData: HistoricSample[];

  getValue(): PropertyValue | undefined;
  getTimestamp(): string | undefined;

  getState(): {
    value: PropertyValue | undefined;
    type: HashTypes | undefined | string;
    timestamp?: Timestamp;
    timeAttrs?: Record<string, unknown>;
    info?: PropertyInfo;
    historicData: HistoricSample[];
  };

  setValue(
    value: PropertyValue,
    options?: {
      timestamp?: Timestamp;
    }
  ): void;

  reset(): void;

  setHistoricData(data: HistoricSample[]): void;

  onChange(handler: PropertyChangeHandler): () => void;
  onHistoricData(handler: HistoricDataHandler): () => void;

  toJSON(): object;
  destroy(): void;
}

/**
 * Full property model: static definition + live state.
 */
export interface PropertyModel {
  schema: PropertySchema;
  binding: PropertyBinding;
}
