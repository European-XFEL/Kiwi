/**
 * Represents a high-precision timestamp used in Karabo data systems.
 *
 * This class provides conversion and arithmetic utilities for timestamps
 * with attosecond (10⁻¹⁸ second) internal precision.
 *
 * - Internal representation: **attoseconds since Unix epoch (1970-01-01T00:00:00Z)**.
 * - Can be constructed from various time sources:
 *   - JavaScript `Date` objects
 *   - Epoch times in seconds, milliseconds, nanoseconds, or attoseconds
 * - Provides safe conversion to lower-precision units (ns, µs, ms, s)
 *   suitable for JavaScript and plotting libraries.
 *
 * @example
 * ```ts
 * const t1 = Timestamp.fromMilliseconds(Date.now());
 * console.log(t1.toSeconds());        // → seconds since epoch
 * console.log(t1.toISOString());      // → ISO 8601 string
 *
 * const t2 = Timestamp.fromtimeAttrs(attrs);
 * console.log(t2.diffMs(t1));         // → difference in milliseconds
 * ```
 */
export class Timestamp {
  // ----- Unit constants (attoseconds per X) -----
  private static readonly AS_PER_SEC = 1_000_000_000_000_000_000n; // 1e18
  private static readonly AS_PER_MS = 1_000_000_000_000_000n; // 1e15
  private static readonly AS_PER_US = 1_000_000_000_000n; // 1e12
  private static readonly AS_PER_NS = 1_000_000_000n; // 1e9

  private static readonly MIN = 0n; // sanity: timestamps must be non-negative

  private readonly attoseconds: bigint;

  /**
   * Construct from:
   *  - bigint (attoseconds since epoch)
   *  - Date (epoch milliseconds)
   *  - number (epoch milliseconds) — use static fromSeconds/fromMilliseconds to be explicit
   */
  constructor(source: any) {
    if (typeof source === 'bigint') {
      this.attoseconds = source;
    } else if (source instanceof Date) {
      this.attoseconds = BigInt(source.getTime()) * Timestamp.AS_PER_MS;
    } else if (typeof source === 'number') {
      // Interpret numbers as epoch milliseconds to match JS Date conventions.
      this.attoseconds = BigInt(Math.floor(source)) * Timestamp.AS_PER_MS;
    } else {
      // Karabo property attributes
      this.attoseconds = Timestamp.attosecondsFromTimeAttrs(source);
    }

    this.validate();
  }

  // ---------- Static factories (explicit & self-documenting) ----------

  /** From Karabo property attributes (sec in s, frac in attoseconds). */
  static fromTimeAttrs(attrs: any): Timestamp {
    return new Timestamp(this.attosecondsFromTimeAttrs(attrs));
  }

  /** From epoch seconds (number). */
  static fromSeconds(seconds: number): Timestamp {
    const as = BigInt(Math.floor(seconds)) * this.AS_PER_SEC;
    return new Timestamp(as);
  }

  /** From epoch milliseconds (number). */
  static fromMilliseconds(ms: number): Timestamp {
    const as = BigInt(Math.floor(ms)) * this.AS_PER_MS;
    return new Timestamp(as);
  }

  /** From epoch nanoseconds (number | bigint). */
  static fromNanoseconds(ns: number | bigint): Timestamp {
    const nsBig = typeof ns === 'bigint' ? ns : BigInt(Math.floor(ns));
    const as = nsBig * this.AS_PER_NS;
    return new Timestamp(as);
  }

  /** From attoseconds (bigint). */
  static fromAttoseconds(as: bigint): Timestamp {
    return new Timestamp(as);
  }

  /** Current time (uses system clock, ms precision). */
  static now(): Timestamp {
    return new Timestamp(new Date());
  }

  // ---------- Conversions ----------

  /** Get timestamp in attoseconds since epoch. */
  toAttoseconds(): bigint {
    return this.attoseconds;
  }

  /** Convert to nanoseconds (10^-9 s). */
  toNanoseconds(): bigint {
    return this.attoseconds / Timestamp.AS_PER_NS;
  }

  /** Convert to microseconds (10^-6 s). */
  toMicroseconds(): bigint {
    return this.attoseconds / Timestamp.AS_PER_US;
  }

  /** Convert to milliseconds (10^-3 s). */
  toMilliseconds(): number {
    // Integer division preserves floor behavior; JS Date uses ms granularity anyway.
    return Number(this.attoseconds / Timestamp.AS_PER_MS);
  }

  /** Convert to seconds (floating number). */
  toSeconds(): number {
    // Note: converts to double; fine for human-facing use.
    return Number(this.attoseconds) / Number(Timestamp.AS_PER_SEC);
  }

  /** Convert to JavaScript Date (ms precision). */
  toDate(): Date {
    return new Date(this.toMilliseconds());
  }

  /** ISO 8601 string via Date (ms precision). */
  toISOString(): string {
    return this.toDate().toISOString();
  }

  /** Locale string via Date (ms precision). */
  toLocaleString(
    locale?: string,
    options?: Intl.DateTimeFormatOptions
  ): string {
    return this.toDate().toLocaleString(locale, options);
  }

  /** Unix timestamp in seconds (floating number). */
  toUnixTimestamp(): number {
    return this.toSeconds();
  }

  // ---------- Comparisons & arithmetic ----------

  clone(): Timestamp {
    return new Timestamp(this.attoseconds);
  }

  /** Difference between two timestamps in milliseconds (number). */
  diffMs(other: Timestamp): number {
    const diffAs = this.attoseconds - other.attoseconds;
    return Number(diffAs / Timestamp.AS_PER_MS);
  }

  isBefore(other: Timestamp): boolean {
    return this.attoseconds < other.attoseconds;
  }

  isAfter(other: Timestamp): boolean {
    return this.attoseconds > other.attoseconds;
  }

  equals(other: Timestamp): boolean {
    return this.attoseconds === other.attoseconds;
  }

  addMilliseconds(ms: number): Timestamp {
    const asToAdd = BigInt(Math.trunc(ms)) * Timestamp.AS_PER_MS;
    return new Timestamp(this.attoseconds + asToAdd);
  }

  addSeconds(seconds: number): Timestamp {
    const asToAdd = BigInt(Math.trunc(seconds)) * Timestamp.AS_PER_SEC;
    return new Timestamp(this.attoseconds + asToAdd);
  }

  // ---------- Internals ----------

  private static attosecondsFromTimeAttrs(attrs: any): bigint {
    if (!attrs) throw new Error('timeAttrs must be provided');
    const sec = attrs.has('sec') ? attrs.getValue('sec') : undefined;
    const frac = attrs.has('frac') ? attrs.getValue('frac') : undefined;
    if (typeof sec == 'undefined' || typeof frac == 'undefined') {
      throw new Error("timeAttrs must contain 'sec' and 'frac' fields");
    }
    const secValue = this.toBigInt(sec);
    const fracValue = this.toBigInt(frac);
    return secValue * this.AS_PER_SEC + fracValue;
  }

  private static toBigInt(value: unknown): bigint {
    if (typeof value === 'bigint') {
      return value;
    }

    if (typeof value === 'number') {
      //Reject floats
      if (!Number.isInteger(value)) {
        throw new Error(
          `Cannot convert float (${value}) to BigInt. Expected integer, got fractional value.`
        );
      }
      // Reject special values
      if (!Number.isFinite(value)) {
        throw new Error(`Cannot convert ${value} to BigInt. Must be finite.`);
      }
      return BigInt(value);
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();

      //REGEX: Allow + or - prefix
      if (!/^[+-]?\d+$/.test(trimmed)) {
        throw new Error(
          `String "${value}" is not a valid integer (contains decimals, scientific notation, or invalid characters)`
        );
      }

      //Reject leading zeros (except "0")
      if (/^[+-]?0\d+/.test(trimmed)) {
        throw new Error(`String "${value}" has invalid leading zeros`);
      }

      try {
        return BigInt(trimmed);
      } catch (error) {
        throw new Error(
          `Failed to convert "${value}" to BigInt: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    if (typeof value === 'boolean') {
      return value ? 1n : 0n;
    }

    throw new Error(
      `Cannot convert value to BigInt: received type ${typeof value}`
    );
  }

  private validate(): void {
    if (this.attoseconds < Timestamp.MIN) {
      console.warn(`Negative timestamp value: ${this.attoseconds}`);
    }
  }

  // ---------- String/JSON ----------

  toString(): string {
    return this.toISOString();
  }

  toJSON(): string {
    return this.toISOString();
  }
}
