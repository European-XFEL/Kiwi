// Define what a valid Subclass Constructor looks that
// takes a number in the constructor and have a static MIN and MAX

export abstract class Integer {
  public value_: number;

  constructor(value: number) {
    this.value_ = value;
  }

  get value(): number {
    return this.value_;
  }

  // Coerce from a string
  static cast<T extends Integer>(
    this: { new (value: number): T; MIN: number; MAX: number },
    value: any
  ): T {
    if (value instanceof this) {
      return value;
    }

    if (value !== null && typeof value === 'object') {
      value = value.value_ ?? value.value ?? value.valueOf();
    }

    const parsed = typeof value === 'string' ? parseFloat(value) : value;

    if (typeof parsed !== 'number' || Number.isNaN(parsed)) {
      throw new Error(`Value must be a valid number. Given: ${value}`);
    }

    if (!Number.isInteger(parsed)) {
      throw new Error(`Value must be an integer. Given: ${value}`);
    }

    if (parsed < this.MIN || parsed > this.MAX) {
      throw new Error(
        `Value out of bounds (${this.MIN} to ${this.MAX}). Given: ${value}`
      );
    }

    return new this(parsed);
  }
}

// --------------------------------------

export abstract class BigInteger {
  public value_: bigint;

  constructor(value: bigint) {
    this.value_ = value;
  }

  get value(): bigint {
    return this.value_;
  }

  static cast<T extends BigInteger>(
    this: { new (value: bigint): T; MIN: bigint; MAX: bigint },
    value: any
  ): T {
    if (value instanceof this) {
      return value;
    }

    if (value !== null && typeof value === 'object') {
      value = value.value_ ?? value.value ?? value.valueOf();
    }

    let parsed: bigint;
    try {
      // Note: BigInt() natively handles string parsing and throws on decimals/invalid chars
      parsed = BigInt(value);
    } catch {
      throw new Error(`Value must be a valid 64-bit integer. Given: ${value}`);
    }

    if (parsed < this.MIN || parsed > this.MAX) {
      throw new Error(
        `Value out of bounds (${this.MIN} to ${this.MAX}). Given: ${value}`
      );
    }

    return new this(parsed);
  }
}

// --------------------------------------

export abstract class FloatingPoint {
  public value_: number;

  constructor(value: number) {
    this.value_ = value;
  }

  get value(): number {
    return this.value_;
  }

  static cast<T extends FloatingPoint>(
    this: { new (value: number): T; MIN: number; MAX: number },
    value: any
  ): T {
    if (value instanceof this) {
      return value;
    }
    if (value !== null && typeof value === 'object') {
      value = value.value_ ?? value.value ?? value.valueOf();
    }
    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    // Reject arrays, objects, booleans, etc.
    if (typeof parsed !== 'number') {
      throw new Error(`Value must be a valid number. Given: ${value}`);
    }
    // XXX: Javascript parses to NaN for other objects, hence, we need to compare to original
    if (Number.isNaN(parsed)) {
      if (typeof value === 'string' && value !== 'NaN') {
        throw new Error(`Value must be a valid number. Given: ${value}`);
      }
    } else {
      // Check boundaries.
      if (parsed < this.MIN || parsed > this.MAX) {
        throw new Error(
          `Value out of bounds (${this.MIN} to ${this.MAX}). Given: ${value}`
        );
      }
    }

    return new this(parsed);
  }
}
