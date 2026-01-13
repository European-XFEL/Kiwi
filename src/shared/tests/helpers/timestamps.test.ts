import { Timestamp } from '@/lib/binding/utils/timestamps';
import { HashTypes } from 'karabo-ts';

describe('Timestamp', () => {
  describe('Construction', () => {
    it('should construct from bigint (attoseconds)', () => {
      const as = 1_000_000_000_000_000_000n; // 1 second in attoseconds
      const ts = new Timestamp(as);
      expect(ts.toAttoseconds()).toBe(as);
    });

    it('should construct from Date object', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const ts = new Timestamp(date);
      expect(ts.toMilliseconds()).toBe(date.getTime());
    });

    it('should construct from number (epoch milliseconds)', () => {
      const ms = 1704067200000; // 2024-01-01T00:00:00.000Z
      const ts = new Timestamp(ms);
      expect(ts.toMilliseconds()).toBe(ms);
    });

    it('should floor fractional milliseconds when constructing from number', () => {
      const ts = new Timestamp(1234.567);
      expect(ts.toMilliseconds()).toBe(1234);
    });

    it('should construct from timeAttrs (Karabo format)', () => {
      const attrs = {
        sec: { type_: HashTypes.Int64, value_: 1704067200n }, // seconds
        frac: { type_: HashTypes.Int64, value_: 500_000_000_000_000n }, // 0.5ms in attoseconds
      };
      const ts = new Timestamp(attrs);
      expect(ts.toMilliseconds()).toBe(1704067200000);
    });

    it('should throw error for timeAttrs without sec field', () => {
      const attrs = {
        frac: { value_: 0n },
      } as any;
      expect(() => new Timestamp(attrs)).toThrow(
        "timeAttrs must contain 'sec' and 'frac' fields"
      );
    });

    it('should throw error for timeAttrs without frac field', () => {
      const attrs = {
        sec: { value_: 0n },
      } as any;
      expect(() => new Timestamp(attrs)).toThrow(
        "timeAttrs must contain 'sec' and 'frac' fields"
      );
    });

    it('should throw error for undefined timeAttrs', () => {
      expect(() => new Timestamp(undefined as any)).toThrow(
        'timeAttrs must be provided'
      );
    });

    it('should warn for negative timestamp values', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      new Timestamp(-1000n);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Negative timestamp value: -1000'
      );
      consoleSpy.mockRestore();
    });
  });

  describe('Static factory methods', () => {
    describe('fromTimeAttrs', () => {
      it('should create timestamp from Karabo time attributes', () => {
        const attrs = {
          sec: { type_: HashTypes.Int64, value_: 1000n },
          frac: { type_: HashTypes.UInt64, value_: 500_000_000_000_000_000n }, // 0.5 seconds
        };
        const ts = Timestamp.fromTimeAttrs(attrs);
        expect(ts.toSeconds()).toBe(1000.5);
      });

      it('should handle zero fractional part', () => {
        const attrs = {
          sec: { type_: HashTypes.Int64, value_: 1000n },
          frac: { type_: HashTypes.UInt64, value_: 0n },
        };
        const ts = Timestamp.fromTimeAttrs(attrs);
        expect(ts.toSeconds()).toBe(1000);
      });
    });

    describe('fromSeconds', () => {
      it('should create timestamp from epoch seconds', () => {
        const ts = Timestamp.fromSeconds(1704067200);
        expect(ts.toSeconds()).toBe(1704067200);
      });

      it('should floor fractional seconds', () => {
        const ts = Timestamp.fromSeconds(1234.567);
        expect(ts.toSeconds()).toBe(1234);
      });
    });

    describe('fromMilliseconds', () => {
      it('should create timestamp from epoch milliseconds', () => {
        const ts = Timestamp.fromMilliseconds(1704067200000);
        expect(ts.toMilliseconds()).toBe(1704067200000);
      });

      it('should floor fractional milliseconds', () => {
        const ts = Timestamp.fromMilliseconds(1234.567);
        expect(ts.toMilliseconds()).toBe(1234);
      });
    });

    describe('fromNanoseconds', () => {
      it('should create timestamp from nanoseconds (number)', () => {
        const ns = 1_704_067_200_000_000_000;
        const ts = Timestamp.fromNanoseconds(ns);
        expect(ts.toNanoseconds()).toBe(BigInt(ns));
      });

      it('should create timestamp from nanoseconds (bigint)', () => {
        const ns = 1_704_067_200_000_000_000n;
        const ts = Timestamp.fromNanoseconds(ns);
        expect(ts.toNanoseconds()).toBe(ns);
      });

      it('should floor fractional nanoseconds', () => {
        const ts = Timestamp.fromNanoseconds(1234.567);
        expect(ts.toNanoseconds()).toBe(1234n);
      });
    });

    describe('fromAttoseconds', () => {
      it('should create timestamp from attoseconds', () => {
        const as = 1_234_567_890_123_456_789n;
        const ts = Timestamp.fromAttoseconds(as);
        expect(ts.toAttoseconds()).toBe(as);
      });
    });

    describe('now', () => {
      it('should create timestamp with current time', () => {
        const before = Date.now();
        const ts = Timestamp.now();
        const after = Date.now();

        const tsMs = ts.toMilliseconds();
        expect(tsMs).toBeGreaterThanOrEqual(before);
        expect(tsMs).toBeLessThanOrEqual(after);
      });
    });
  });

  describe('Conversions', () => {
    const baseAs = 1_234_567_890_123_456_789n;
    let ts: Timestamp;

    beforeEach(() => {
      ts = new Timestamp(baseAs);
    });

    it('should convert to attoseconds', () => {
      expect(ts.toAttoseconds()).toBe(baseAs);
    });

    it('should convert to nanoseconds', () => {
      expect(ts.toNanoseconds()).toBe(1_234_567_890n);
    });

    it('should convert to microseconds', () => {
      expect(ts.toMicroseconds()).toBe(1_234_567n);
    });

    it('should convert to milliseconds', () => {
      expect(ts.toMilliseconds()).toBe(1234);
    });

    it('should convert to seconds', () => {
      expect(ts.toSeconds()).toBeCloseTo(1.234567890123457, 15);
    });

    it('should convert to Date object', () => {
      const ts = Timestamp.fromMilliseconds(1704067200000);
      const date = ts.toDate();
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBe(1704067200000);
    });

    it('should convert to ISO string', () => {
      const ts = Timestamp.fromMilliseconds(1704067200000);
      expect(ts.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should convert to locale string', () => {
      const ts = Timestamp.fromMilliseconds(1704067200000);
      const localeString = ts.toLocaleString('en-US');
      expect(localeString).toBeTruthy();
      expect(typeof localeString).toBe('string');
    });

    it('should convert to locale string with options', () => {
      const ts = Timestamp.fromMilliseconds(1704067200000);
      const localeString = ts.toLocaleString('en-US', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
      expect(localeString).toBeTruthy();
      expect(typeof localeString).toBe('string');
    });

    it('should convert to Unix timestamp', () => {
      const ts = Timestamp.fromSeconds(1704067200);
      expect(ts.toUnixTimestamp()).toBe(1704067200);
    });
  });

  describe('Comparisons', () => {
    const ts1 = Timestamp.fromMilliseconds(1000);
    const ts2 = Timestamp.fromMilliseconds(2000);
    const ts3 = Timestamp.fromMilliseconds(1000);

    it('should correctly compare with isBefore', () => {
      expect(ts1.isBefore(ts2)).toBe(true);
      expect(ts2.isBefore(ts1)).toBe(false);
      expect(ts1.isBefore(ts3)).toBe(false);
    });

    it('should correctly compare with isAfter', () => {
      expect(ts2.isAfter(ts1)).toBe(true);
      expect(ts1.isAfter(ts2)).toBe(false);
      expect(ts1.isAfter(ts3)).toBe(false);
    });

    it('should correctly compare with equals', () => {
      expect(ts1.equals(ts3)).toBe(true);
      expect(ts1.equals(ts2)).toBe(false);
      expect(ts2.equals(ts1)).toBe(false);
    });

    it('should calculate difference in milliseconds', () => {
      expect(ts2.diffMs(ts1)).toBe(1000);
      expect(ts1.diffMs(ts2)).toBe(-1000);
      expect(ts1.diffMs(ts3)).toBe(0);
    });
  });

  describe('Arithmetic operations', () => {
    it('should add milliseconds', () => {
      const ts = Timestamp.fromMilliseconds(1000);
      const result = ts.addMilliseconds(500);
      expect(result.toMilliseconds()).toBe(1500);
    });

    it('should add negative milliseconds', () => {
      const ts = Timestamp.fromMilliseconds(1000);
      const result = ts.addMilliseconds(-300);
      expect(result.toMilliseconds()).toBe(700);
    });

    it('should truncate fractional milliseconds when adding', () => {
      const ts = Timestamp.fromMilliseconds(1000);
      const result = ts.addMilliseconds(123.456);
      expect(result.toMilliseconds()).toBe(1123);
    });

    it('should add seconds', () => {
      const ts = Timestamp.fromSeconds(100);
      const result = ts.addSeconds(50);
      expect(result.toSeconds()).toBe(150);
    });

    it('should add negative seconds', () => {
      const ts = Timestamp.fromSeconds(100);
      const result = ts.addSeconds(-30);
      expect(result.toSeconds()).toBe(70);
    });

    it('should truncate fractional seconds when adding', () => {
      const ts = Timestamp.fromSeconds(100);
      const result = ts.addSeconds(12.345);
      expect(result.toSeconds()).toBe(112);
    });

    it('should not modify original timestamp when adding', () => {
      const ts = Timestamp.fromMilliseconds(1000);
      const original = ts.toMilliseconds();
      ts.addMilliseconds(500);
      expect(ts.toMilliseconds()).toBe(original);
    });
  });

  describe('Clone', () => {
    it('should create independent copy', () => {
      const ts1 = Timestamp.fromMilliseconds(1000);
      const ts2 = ts1.clone();

      expect(ts2.toMilliseconds()).toBe(ts1.toMilliseconds());
      expect(ts1.equals(ts2)).toBe(true);

      // Verify they are different instances
      expect(ts2).not.toBe(ts1);
    });
  });

  describe('String representations', () => {
    it('should convert to string (ISO format)', () => {
      const ts = Timestamp.fromMilliseconds(1704067200000);
      expect(ts.toString()).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should convert to JSON (ISO format)', () => {
      const ts = Timestamp.fromMilliseconds(1704067200000);
      expect(ts.toJSON()).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should serialize correctly in JSON.stringify', () => {
      const ts = Timestamp.fromMilliseconds(1704067200000);
      const obj = { timestamp: ts };
      const json = JSON.stringify(obj);
      expect(json).toBe('{"timestamp":"2024-01-01T00:00:00.000Z"}');
    });
  });

  describe('toBigInt helper', () => {
    it('should convert bigint to bigint', () => {
      const attrs = {
        sec: { type_: HashTypes.Int64, value_: 1000n },
        frac: { type_: HashTypes.UInt64, value_: 0n },
      };
      const ts = Timestamp.fromTimeAttrs(attrs);
      expect(ts.toSeconds()).toBe(1000);
    });

    it('should convert integer number to bigint', () => {
      const attrs = {
        sec: { type_: HashTypes.Int64, value_: 1000 },
        frac: { type_: HashTypes.UInt64, value_: 0 },
      };
      const ts = Timestamp.fromTimeAttrs(attrs);
      expect(ts.toSeconds()).toBe(1000);
    });

    it('should convert string to bigint', () => {
      const attrs = {
        sec: { type_: HashTypes.Int64, value_: '1000' },
        frac: { type_: HashTypes.UInt64, value_: '0' },
      };
      const ts = Timestamp.fromTimeAttrs(attrs);
      expect(ts.toSeconds()).toBe(1000);
    });

    it('should convert string with leading + to bigint', () => {
      const attrs = {
        sec: { type_: HashTypes.Int64, value_: '+1000' },
        frac: { type_: HashTypes.UInt64, value_: '0' },
      };
      const ts = Timestamp.fromTimeAttrs(attrs);
      expect(ts.toSeconds()).toBe(1000);
    });

    it('should convert string with leading - to bigint', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const attrs = {
        sec: { type_: HashTypes.Int64, value_: '-1000' },
        frac: { type_: HashTypes.UInt64, value_: '0' },
      };
      const ts = Timestamp.fromTimeAttrs(attrs);
      expect(ts.toSeconds()).toBe(-1000);
      consoleSpy.mockRestore();
    });

    it('should convert boolean true to 1n', () => {
      const attrs = {
        sec: { type_: HashTypes.Bool, value_: true },
        frac: { type_: HashTypes.UInt64, value_: 0 },
      };
      const ts = Timestamp.fromTimeAttrs(attrs);
      expect(ts.toSeconds()).toBe(1);
    });

    it('should convert boolean false to 0n', () => {
      const attrs = {
        sec: { type_: HashTypes.Bool, value_: false },
        frac: { type_: HashTypes.UInt64, value_: 0 },
      };
      const ts = Timestamp.fromTimeAttrs(attrs);
      expect(ts.toSeconds()).toBe(0);
    });

    it('should throw error for float number', () => {
      const attrs = {
        sec: { type_: HashTypes.Float64, value_: 1000.5 },
        frac: { type_: HashTypes.UInt64, value_: 0 },
      };
      expect(() => Timestamp.fromTimeAttrs(attrs)).toThrow(
        'Cannot convert float (1000.5) to BigInt. Expected integer, got fractional value.'
      );
    });

    it('should throw error for Infinity', () => {
      const attrs = {
        sec: { type_: HashTypes.Float64, value_: Infinity },
        frac: { type_: HashTypes.UInt64, value_: 0 },
      };
      expect(() => Timestamp.fromTimeAttrs(attrs)).toThrow(
        'Cannot convert float (Infinity) to BigInt. Expected integer, got fractional value.'
      );
    });

    it('should throw error for NaN', () => {
      const attrs = {
        sec: { type_: HashTypes.Float64, value_: NaN },
        frac: { type_: HashTypes.UInt64, value_: 0 },
      };
      expect(() => Timestamp.fromTimeAttrs(attrs)).toThrow(
        'Cannot convert float (NaN) to BigInt. Expected integer, got fractional value.'
      );
    });

    it('should throw error for string with decimals', () => {
      const attrs = {
        sec: { type_: HashTypes.String, value_: '1000.5' },
        frac: { type_: HashTypes.UInt64, value_: 0 },
      };
      expect(() => Timestamp.fromTimeAttrs(attrs)).toThrow(
        'String "1000.5" is not a valid integer'
      );
    });

    it('should throw error for string with scientific notation', () => {
      const attrs = {
        sec: { type_: HashTypes.String, value_: '1e3' },
        frac: { type_: HashTypes.UInt64, value_: 0 },
      };
      expect(() => Timestamp.fromTimeAttrs(attrs)).toThrow(
        'String "1e3" is not a valid integer'
      );
    });

    it('should throw error for string with leading zeros', () => {
      const attrs = {
        sec: { type_: HashTypes.String, value_: '01000' },
        frac: { type_: HashTypes.UInt64, value_: 0 },
      };
      expect(() => Timestamp.fromTimeAttrs(attrs)).toThrow(
        'String "01000" has invalid leading zeros'
      );
    });

    it('should allow string with just zero', () => {
      const attrs = {
        sec: { type_: HashTypes.String, value_: '0' },
        frac: { type_: HashTypes.UInt64, value_: 0 },
      };
      const ts = Timestamp.fromTimeAttrs(attrs);
      expect(ts.toSeconds()).toBe(0);
    });

    it('should throw error for invalid string', () => {
      const attrs = {
        sec: { type_: HashTypes.String, value_: 'abc' },
        frac: { type_: HashTypes.UInt64, value_: 0 },
      };
      expect(() => Timestamp.fromTimeAttrs(attrs)).toThrow(
        'String "abc" is not a valid integer'
      );
    });

    it('should throw error for unsupported types', () => {
      const attrs = {
        sec: { type_: HashTypes.Hash, value_: {} },
        frac: { type_: HashTypes.UInt64, value_: 0 },
      };
      expect(() => Timestamp.fromTimeAttrs(attrs)).toThrow(
        'Cannot convert value to BigInt: received type object'
      );
    });
  });

  describe('Edge cases and precision', () => {
    it('should handle very large timestamps', () => {
      const largeAs = 9_999_999_999_999_999_999n;
      const ts = new Timestamp(largeAs);
      expect(ts.toAttoseconds()).toBe(largeAs);
    });

    it('should handle zero timestamp', () => {
      const ts = Timestamp.fromSeconds(0);
      expect(ts.toSeconds()).toBe(0);
      expect(ts.toMilliseconds()).toBe(0);
      expect(ts.toISOString()).toBe('1970-01-01T00:00:00.000Z');
    });

    it('should maintain precision in nanoseconds', () => {
      const ns = 1_234_567_890_123n;
      const ts = Timestamp.fromNanoseconds(ns);
      expect(ts.toNanoseconds()).toBe(ns);
    });

    it('should handle attosecond precision for fractions', () => {
      const attrs = {
        sec: { type_: HashTypes.Int64, value_: 0n },
        frac: { type_: HashTypes.UInt64, value_: 1n }, // 1 attosecond
      };
      const ts = Timestamp.fromTimeAttrs(attrs);
      expect(ts.toAttoseconds()).toBe(1n);
    });

    it('should preserve attosecond precision through conversions', () => {
      const attrs = {
        sec: { type_: HashTypes.Int64, value_: 1n },
        frac: { type_: HashTypes.UInt64, value_: 500_000_000_000_000_000n }, // exactly 0.5 seconds
      };
      const ts = Timestamp.fromTimeAttrs(attrs);

      // Converting down to milliseconds and back should preserve precision
      const ms = ts.toMilliseconds();
      expect(ms).toBe(1500);

      const ts2 = Timestamp.fromMilliseconds(ms);
      expect(ts2.toMilliseconds()).toBe(ms);
    });
  });

  describe('Integration tests', () => {
    it('should handle typical Karabo workflow', () => {
      // Simulating receiving a timestamp from Karabo device
      const karaboAttrs = {
        sec: { type_: HashTypes.Int64, value_: '1704067200' },
        frac: { type_: HashTypes.UInt64, value_: '500000000000000000' }, // 0.5 seconds
      };

      const ts = Timestamp.fromTimeAttrs(karaboAttrs);

      // Convert for display
      expect(ts.toISOString()).toBe('2024-01-01T00:00:00.500Z');

      // Convert for plotting (milliseconds)
      expect(ts.toMilliseconds()).toBe(1704067200500);

      // Calculate time difference
      const now = Timestamp.now();
      const diffMs = now.diffMs(ts);
      expect(typeof diffMs).toBe('number');
    });

    it('should handle timestamp arithmetic chains', () => {
      const start = Timestamp.fromSeconds(100);

      const result = start.addSeconds(50).addMilliseconds(500).addSeconds(-10);

      expect(result.toSeconds()).toBe(140.5);
    });

    it('should support timestamp comparisons in sorting', () => {
      const timestamps = [
        Timestamp.fromMilliseconds(3000),
        Timestamp.fromMilliseconds(1000),
        Timestamp.fromMilliseconds(2000),
      ];

      timestamps.sort((a, b) => {
        if (a.isBefore(b)) return -1;
        if (a.isAfter(b)) return 1;
        return 0;
      });

      expect(timestamps[0].toMilliseconds()).toBe(1000);
      expect(timestamps[1].toMilliseconds()).toBe(2000);
      expect(timestamps[2].toMilliseconds()).toBe(3000);
    });
  });
});
