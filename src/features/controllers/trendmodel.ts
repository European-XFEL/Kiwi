export type TrendData = {
  timestamps: number[];
  values: number[];
};

const GENERATION_COUNT = 4;
const GENERATION_SIZE = 200;
const GENERATION_BASE = 10;
const SPARE_SIZE = 100;
const DISPLAY_SIZE = SPARE_SIZE + GENERATION_COUNT * GENERATION_SIZE;

type Point = readonly [timestamp: number, value: number];

class Generation {
  private readonly timestamps = new Float64Array(GENERATION_SIZE);
  private readonly values = new Float64Array(GENERATION_SIZE);
  private start = 0;
  private fill = 0;

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

    this.data.timestamps.push(timestamp);
    this.data.values.push(value);

    // The spare region lets raw points accumulate between bounded rebuilds.
    if (this.data.values.length === DISPLAY_SIZE) this.fillFromGenerations();
  }

  view(): TrendData {
    // Consumers share live arrays and must signal updates with a data revision.
    return this.data;
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
