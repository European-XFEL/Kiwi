export interface TrendData {
  timestamps: Float64Array;
  values: Float64Array;
}

const GENERATION_COUNT = 4;
const GENERATION_SIZE = 200;
const GENERATION_BASE = 10;
const SPARE_SIZE = 100;
const DISPLAY_SIZE = SPARE_SIZE + GENERATION_COUNT * GENERATION_SIZE;

type Point = readonly [timestamp: number, value: number];

class Generation {
  private readonly timestamps = new Float64Array(GENERATION_SIZE);
  private readonly values = new Float64Array(GENERATION_SIZE);
  private fill = 0;

  addPoint(timestamp: number, value: number): Point | undefined {
    this.timestamps[this.fill] = timestamp;
    this.values[this.fill] = value;
    this.fill++;

    if (this.fill < GENERATION_SIZE) return undefined;

    // Collapse the oldest block and pass its average to the coarser level.
    // Keeping the remaining points preserves detail near the live edge.
    let timestampSum = 0;
    let valueSum = 0;
    for (let i = 0; i < GENERATION_BASE; i++) {
      timestampSum += this.timestamps[i];
      valueSum += this.values[i];
    }

    this.timestamps.copyWithin(0, GENERATION_BASE, this.fill);
    this.values.copyWithin(0, GENERATION_BASE, this.fill);
    this.fill -= GENERATION_BASE;

    return [timestampSum / GENERATION_BASE, valueSum / GENERATION_BASE];
  }

  copyInto(
    timestamps: Float64Array,
    values: Float64Array,
    offset: number
  ): number {
    timestamps.set(this.timestamps.subarray(0, this.fill), offset);
    values.set(this.values.subarray(0, this.fill), offset);
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
  private readonly timestamps = new Float64Array(DISPLAY_SIZE);
  private readonly values = new Float64Array(DISPLAY_SIZE);
  private fill = 0;

  addPoint(timestamp: number, value: number): void {
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

    this.timestamps[this.fill] = timestamp;
    this.values[this.fill] = value;
    this.fill++;

    // The spare region lets raw points accumulate between bounded rebuilds.
    if (this.fill === DISPLAY_SIZE) this.fillFromGenerations();
  }

  snapshot(): TrendData {
    // slice keeps snapshots isolated while preserving compact typed storage.
    return {
      timestamps: this.timestamps.slice(0, this.fill),
      values: this.values.slice(0, this.fill),
    };
  }

  private fillFromGenerations(): void {
    let position = 0;
    // Coarse-to-fine order keeps timestamps chronological for plotting.
    for (const generation of this.generations) {
      position = generation.copyInto(this.timestamps, this.values, position);
    }
    this.fill = position;
  }
}
