import sortedIndex from 'lodash/sortedIndex';
import type { Range } from '../common/constants';

export type TrendData = {
  timestamps: number[];
  values: number[];
};

const GENERATION_COUNT = 4;
const GENERATION_SIZE = 200;
const GENERATION_BASE = 10;
const SPARE_SIZE = 100;
const DISPLAY_SIZE = SPARE_SIZE + GENERATION_COUNT * GENERATION_SIZE;
const HISTORY_COVERAGE_THRESHOLD = 0.9;

function acceptHistory(
  current: TrendData,
  history: TrendData,
  [t0, t1]: Range
): boolean {
  if (!history.timestamps.length || t0 === t1) {
    return false;
  }
  const p0 = sortedIndex(current.timestamps, t0);
  const p1 = sortedIndex(current.timestamps, t1);
  const np0 = sortedIndex(history.timestamps, t0);
  const np1 = sortedIndex(history.timestamps, t1);
  if (np1 - np0 >= p1 - p0) {
    return true;
  }
  const span =
    (current.timestamps[p1 - 1] - current.timestamps[p0]) / (t1 - t0);
  const nspan =
    (history.timestamps[np1 - 1] - history.timestamps[np0]) / (t1 - t0);
  // Accept fewer points only when coverage improves and the current
  // interval coverage is below 90%.
  return nspan > span && span < HISTORY_COVERAGE_THRESHOLD;
}

type Point = readonly [timestamp: number, value: number];

class Generation {
  private readonly timestamps = new Float64Array(GENERATION_SIZE);
  private readonly values = new Float64Array(GENERATION_SIZE);
  private start = 0;
  private fill = 0;

  purge(): void {
    this.start = 0;
    this.fill = 0;
  }

  addPoint(timestamp: number, value: number): Point | undefined {
    const position = (this.start + this.fill) % GENERATION_SIZE;
    this.timestamps[position] = timestamp;
    this.values[position] = value;
    this.fill++;

    if (this.fill < GENERATION_SIZE) return undefined;

    // Collapse the oldest block and pass its average to the coarser level.
    // Keeping the remaining points preserves detail near the live edge.
    let timestampSum = 0;
    let valueSum = 0;
    for (let i = 0; i < GENERATION_BASE; i++) {
      const position = (this.start + i) % GENERATION_SIZE;
      timestampSum += this.timestamps[position];
      valueSum += this.values[position];
    }

    this.start = (this.start + GENERATION_BASE) % GENERATION_SIZE;
    this.fill -= GENERATION_BASE;

    return [timestampSum / GENERATION_BASE, valueSum / GENERATION_BASE];
  }

  pruneBefore(timestamp: number): void {
    while (this.fill && this.timestamps[this.start] < timestamp) {
      this.start = (this.start + 1) % GENERATION_SIZE;
      this.fill--;
    }
  }

  copyInto(timestamps: number[], values: number[], offset: number): number {
    for (let i = 0; i < this.fill; i++) {
      const position = (this.start + i) % GENERATION_SIZE;
      timestamps[offset + i] = this.timestamps[position];
      values[offset + i] = this.values[position];
    }
    return offset + this.fill;
  }
}

/**
 * Bounded multiresolution storage for a live trend. Older points become
 * progressively coarser while recent points keep their original resolution.
 */
export class TrendModel {
  // Index 0 is the coarsest generation; the last index receives raw samples.
  private readonly generations = Array.from(
    { length: GENERATION_COUNT },
    () => new Generation()
  );
  private readonly data: TrendData = { timestamps: [], values: [] };

  private history: TrendData = { timestamps: [], values: [] };
  private historyEnd = -Infinity;

  purge(): void {
    this.data.timestamps.splice(0, this.data.timestamps.length);
    this.data.values.splice(0, this.data.values.length);
    this.history = { timestamps: [], values: [] };
    this.historyEnd = -Infinity;
    for (const generation of this.generations) {
      generation.purge();
    }
  }

  setHistory(data: TrendData, range: Range): boolean {
    if (!acceptHistory(this.view(), data, range)) {
      return false;
    }
    this.history = data;
    this.historyEnd = data.timestamps.at(-1)!;
    for (const generation of this.generations) {
      generation.pruneBefore(this.historyEnd);
    }
    this.fillFromGenerations();
    return true;
  }

  addPoint(timestamp: number, value: number): void {
    if (timestamp <= this.historyEnd) {
      return;
    }
    let nextTimestamp = timestamp;
    let nextValue = value;

    // A full generation emits one average, which may cascade toward older,
    // coarser generations.
    for (let i = this.generations.length - 1; i >= 0; i--) {
      const point = this.generations[i].addPoint(nextTimestamp, nextValue);
      if (!point) break;
      nextTimestamp = point[0];
      nextValue = point[1];
    }

    this.data.timestamps.push(timestamp);
    this.data.values.push(value);

    // The spare region lets raw points accumulate between bounded rebuilds.
    if (this.data.values.length === DISPLAY_SIZE) this.fillFromGenerations();
  }

  view(): TrendData {
    // Consumers share live arrays and must signal updates with a data revision.
    if (!this.history.timestamps.length) {
      return this.data;
    }
    return {
      timestamps: this.history.timestamps.concat(this.data.timestamps),
      values: this.history.values.concat(this.data.values),
    };
  }

  private fillFromGenerations(): void {
    let position = 0;
    // Coarse-to-fine order keeps timestamps chronological for plotting.
    for (const generation of this.generations) {
      position = generation.copyInto(
        this.data.timestamps,
        this.data.values,
        position
      );
    }
    this.data.timestamps.length = position;
    this.data.values.length = position;
  }
}

/** Exact, bounded storage for categorical samples; categories must never average. */
export class CategoricalTrendModel {
  private readonly data: TrendData = { timestamps: [], values: [] };

  private history: TrendData = { timestamps: [], values: [] };
  private historyEnd = -Infinity;

  purge(): void {
    this.data.timestamps.splice(0, this.data.timestamps.length);
    this.data.values.splice(0, this.data.values.length);
    this.history = { timestamps: [], values: [] };
    this.historyEnd = -Infinity;
  }

  setHistory(data: TrendData, range: Range): boolean {
    if (!acceptHistory(this.view(), data, range)) {
      return false;
    }
    this.history = data;
    this.historyEnd = data.timestamps.at(-1)!;
    const count = sortedIndex(this.data.timestamps, this.historyEnd);
    this.data.timestamps.splice(0, count);
    this.data.values.splice(0, count);
    return true;
  }

  addPoint(timestamp: number, value: number): void {
    if (timestamp <= this.historyEnd) {
      return;
    }
    this.data.timestamps.push(timestamp);
    this.data.values.push(value);
    const excess = this.data.values.length - 900;
    if (excess > 0) {
      this.data.timestamps.splice(0, excess);
      this.data.values.splice(0, excess);
    }
  }

  view(): TrendData {
    if (!this.history.timestamps.length) {
      return this.data;
    }
    return {
      timestamps: this.history.timestamps.concat(this.data.timestamps),
      values: this.history.values.concat(this.data.values),
    };
  }
}
