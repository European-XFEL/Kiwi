import { Hash } from './hash';
import { UInt64Value } from './types';
import { unwrap } from './utils';

const RESOLUTION = 10n ** 18n; // attoseconds
const MILLISECONDS_TO_ATTOS = 10n ** 15n; // 1 ms = 10^15 as

export class Timestamp {
  private _time: bigint;
  private _tid: bigint;

  constructor(date?: Timestamp | number | bigint | string | Date | null) {
    this._tid = 0n;

    if (date === null || date === undefined) {
      this._time = BigInt(Date.now()) * MILLISECONDS_TO_ATTOS;
    } else if (date instanceof Timestamp) {
      this._time = date.time;
      this._tid = date.tid;
    } else if (typeof date === 'number') {
      this._time = BigInt(Math.floor(date * Number(RESOLUTION)));
    } else if (typeof date === 'bigint') {
      this._time = date;
    } else {
      let d: Date;
      if (typeof date === 'string') {
        let cleanStr = date;
        if (cleanStr.endsWith(' UTC')) {
          cleanStr = cleanStr.replace(' UTC', 'Z');
        }
        d = new Date(cleanStr);
      } else {
        d = date;
      }

      if (isNaN(d.getTime())) {
        throw new Error(`Invalid date format: ${date}`);
      }
      this._time = BigInt(d.getTime()) * MILLISECONDS_TO_ATTOS;
    }
  }

  /**
   * Reconstructs a Timestamp from a Map or HashAttributes.
   * Handles both raw BigInts and wrapped KaraboValues.
   */
  public static fromHashAttributes(
    attrs: Map<string, any> | Record<string, any>
  ): Timestamp | undefined {
    // Abstraction to check existence and get value
    const isMap = attrs instanceof Map;

    // Check if 'sec' exists strictly!
    if (isMap ? !(attrs as Map<string, any>).has('sec') : !('sec' in attrs)) {
      return undefined;
    }

    const get = (k: string): any => {
      if (isMap) return (attrs as Map<string, any>).get(k);
      return (attrs as any)[k];
    };

    // Unwrap and calculate
    const sec = unwrap(get('sec'));
    const frac = unwrap(get('frac'));
    const tid = unwrap(get('tid'));

    const ret = new Timestamp(0n);
    ret._time = frac + sec * RESOLUTION;
    ret.tid = tid;

    return ret;
  }

  public toHashAttributes(hash_: Hash): void {
    const timeProperties = this.toMap();
    const entries = hash_.getKeys() as string[];

    if (entries && Array.isArray(entries)) {
      for (const entry of entries) {
        for (const [k, v] of timeProperties.entries()) {
          // Wrap in UInt64Value for consistency with Karabo Hash specs
          hash_.setAttribute(entry, k, new UInt64Value(v));
        }
      }
    }
  }

  // --- Properties ---

  public get time(): bigint {
    return this._time;
  }

  public get time_frac(): bigint {
    return this._time % RESOLUTION;
  }

  public get time_sec(): bigint {
    return this._time / RESOLUTION;
  }

  public get tid(): bigint {
    return this._tid;
  }

  public set tid(value: bigint | number) {
    this._tid = BigInt(value);
  }

  public toMap(): Map<string, bigint> {
    const map = new Map<string, bigint>();
    map.set('frac', this.time_frac);
    map.set('sec', this.time_sec);
    map.set('tid', this.tid);
    return map;
  }

  // --- Formatters & Operators ---

  public toTimestamp(): number {
    return Number(this._time) / Number(RESOLUTION);
  }

  public toLocal(sep: string = 'T', timespec: string = 'auto'): string {
    // Perform arithmetic in BigInt to preserve integer precision
    const msBigInt = this._time / MILLISECONDS_TO_ATTOS;
    // Date takes Number, cast before
    const date = new Date(Number(msBigInt));
    // getTimezoneOffset() returns minutes (negative if we are ahead of UTC, e.g., -60 for CET)
    // We subtract it to shift the time "forward" to match the local visual time.
    const offsetMs = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offsetMs);

    // 3. Get cleaner string: "YYYY-MM-DDTHH:MM:SS.mmm" (drop the 'Z')
    let iso = localDate.toISOString().slice(0, -1);

    // 4. Apply Separator
    if (sep !== 'T') {
      iso = iso.replace('T', sep);
    }

    // 5. Handle timespec (Truncation)
    if (
      timespec === 'seconds' ||
      (timespec === 'auto' && date.getMilliseconds() === 0)
    ) {
      iso = iso.split('.')[0]; // Drop .mmm
    } else if (timespec === 'minutes') {
      iso = iso.slice(0, 16); // Drop :SS.mmm
    } else if (timespec === 'hours') {
      iso = iso.slice(0, 13); // Drop :MM:SS.mmm
    }
    return iso;
  }

  public toUTCString(): string {
    const date = new Date(this.toTimestamp() * 1000);
    return date.toISOString().replace('Z', ' UTC');
  }

  public toString(): string {
    return this.toLocal();
  }

  public equals(other: any): boolean {
    if (!(other instanceof Timestamp)) {
      return false;
    }
    return this.time === other.time;
  }

  public lessThan(other: any): boolean {
    if (!(other instanceof Timestamp)) {
      return false;
    }
    return this.time < other.time;
  }

  public add(other: Timestamp | number): number {
    const thisSec = this.toTimestamp();
    if (other instanceof Timestamp) {
      return thisSec + other.toTimestamp();
    }
    return thisSec + (other as number);
  }

  public subtract(other: Timestamp | number): number {
    const thisSec = this.toTimestamp();
    if (other instanceof Timestamp) {
      return thisSec - other.toTimestamp();
    }
    return thisSec - (other as number);
  }
}
