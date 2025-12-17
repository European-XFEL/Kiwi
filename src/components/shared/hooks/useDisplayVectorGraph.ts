import { useState, useEffect, useMemo } from 'react';
import { throttle } from 'lodash';
import type { DisplayVectorGraphProps } from '@/scene/scene_types/controllers/display';
import {
  schemaSaysVector,
  type SchemaValueType,
} from '@/shared/helpers/validation_helpers/schema_type_identifier';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

/** Any-ish vector primary we get from the controller */
export type VectorPrimary = DisplayVectorGraphProps['primary'];

export interface UseDisplayVectorGraphConfig {
  /**
   * Max points to send to the chart for "small" vectors.
   * For very large vectors, we’ll override this with the DIMENSION_DOWNSAMPLE
   * table below.
   */
  maxPoints?: number;

  /**
   * Max UI update rate (Hz).
   * 10 Hz → ~100 ms between renders (smooth, low CPU)
   * 5  Hz → ~200 ms (more efficient, still responsive)
   * 20 Hz → ~50 ms (high frequency, more CPU intensive)
   * Default: 1 Hz here – you can tune.
   */
  maxUpdateHz?: number;

  /**
   * Optional lower bound from GUI client config.
   * Example: propertyUpdateInterval from GuiServer
   * If present, the throttle interval will be:
   *   throttleMs = max(1000 / maxUpdateHz, propertyUpdateIntervalMs)
   */
  propertyUpdateIntervalMs?: number;
}

const DEFAULT_CONFIG: Required<UseDisplayVectorGraphConfig> = {
  maxPoints: 500,
  maxUpdateHz: 1,
  propertyUpdateIntervalMs: 500,
};

export interface UseDisplayVectorGraphResult {
  vectorData: number[];
  indices: number[];
  schemaValueType?: SchemaValueType;
  isOffline: boolean;
  rawLength: number; // original vector length before downsampling
}

// ─────────────────────────────────────────────────────────────────
// Dimension-based downsampling table
// ─────────────────────────────────────────────────────────────────
//
// [(size, data points)]
// for 200.000 we only want to see 30.000
// for 300.000 we downsample to 40.000
// for 400.000 → 50.000
// for 500.000 → 60.000
//
const DIMENSION_DOWNSAMPLE: Array<{ size: number; points: number }> = [
  { size: 200_000, points: 30_000 },
  { size: 300_000, points: 40_000 },
  { size: 400_000, points: 50_000 },
  { size: 500_000, points: 60_000 },
];

/**
 * Given the raw length, pick a target number of points using the dimension
 * table. For “small” vectors that don’t hit any threshold, fall back to
 * config.maxPoints.
 */
const chooseTargetPoints = (
  length: number,
  defaultMaxPoints: number
): number => {
  let target = defaultMaxPoints;

  for (const rule of DIMENSION_DOWNSAMPLE) {
    if (length >= rule.size) {
      target = rule.points;
    }
  }

  // Never ask for more points than we actually have
  return Math.min(target, length);
};

// ─────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────

/** Try to get schema valueType in a tolerant way */
const getSchemaValueType = (
  primary: VectorPrimary
): SchemaValueType | undefined => {
  return (
    (primary as any)?.valueType ??
    primary?.schemaAttrs?.valueType ??
    primary?.propertyModel?.schema.schemaAttrs.valueType
  );
};

const toNumberSafe = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'bigint') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

/**
 * Normalize raw value into number[] with proper type validation.
 * Handles: Array, TypedArray (Float32Array, Int32Array, etc.)
 */
const normalizeVector = (
  raw: unknown,
  schemaValueType?: SchemaValueType
): number[] => {
  if (!raw) return [];

  const schemaKnowsVector = schemaSaysVector(schemaValueType);
  const isRuntimeVectorShape =
    Array.isArray(raw) ||
    (ArrayBuffer.isView(raw) && !(raw instanceof DataView));

  // Schema says "not vector" and runtime doesn't look like vector → bail
  if (!schemaKnowsVector && !isRuntimeVectorShape) return [];

  // TypedArray (Float32Array, Int32Array, Uint8Array, etc.)
  if (ArrayBuffer.isView(raw) && !(raw instanceof DataView)) {
    try {
      const arr = Array.from(raw as any);
      return arr.map(toNumberSafe).filter((v): v is number => v != null);
    } catch {
      return [];
    }
  }

  // Plain Array
  if (Array.isArray(raw)) {
    return raw.map(toNumberSafe).filter((v): v is number => v != null);
  }

  return [];
};

// ─────────────────────────────────────────────────────────────────
// LTTB implementation (Largest Triangle Three Buckets)
// adapted from flot-downsample (MIT)
// operates on [x, y] tuples and returns sampled [x, y] list.
// ─────────────────────────────────────────────────────────────────

type XYPoint = [number, number];

const lttb = (data: XYPoint[], threshold: number): XYPoint[] => {
  const dataLength = data.length;
  if (threshold >= dataLength || threshold === 0) {
    return data;
  }

  const sampled: XYPoint[] = [];
  let sampledIndex = 0;

  // bucket size, leaving room for first and last point
  const every = (dataLength - 2) / (threshold - 2);

  let a = 0; // a is the first point in the triangle
  sampled[sampledIndex++] = data[a]; // always keep first

  for (let i = 0; i < threshold - 2; i++) {
    // Average for next bucket (contains c)
    let avgX = 0;
    let avgY = 0;

    let avgRangeStart = Math.floor((i + 1) * every) + 1;
    let avgRangeEnd = Math.floor((i + 2) * every) + 1;
    avgRangeEnd = avgRangeEnd < dataLength ? avgRangeEnd : dataLength;

    const avgRangeLength = avgRangeEnd - avgRangeStart || 1;

    for (; avgRangeStart < avgRangeEnd; avgRangeStart++) {
      avgX += data[avgRangeStart][0] * 1; // enforce Number
      avgY += data[avgRangeStart][1] * 1;
    }

    avgX /= avgRangeLength;
    avgY /= avgRangeLength;

    // Range for this bucket
    let rangeOffs = Math.floor((i + 0) * every) + 1;
    const rangeTo = Math.floor((i + 1) * every) + 1;

    const pointAX = data[a][0] * 1;
    const pointAY = data[a][1] * 1;

    let maxArea = -1;
    let maxAreaPoint: XYPoint = data[a];
    let nextA = a;

    for (; rangeOffs < rangeTo; rangeOffs++) {
      const pointBX = data[rangeOffs][0] * 1;
      const pointBY = data[rangeOffs][1] * 1;

      // area of triangle a-b-c (using avg as c)
      const area =
        Math.abs(
          (pointAX - avgX) * (pointBY - pointAY) -
            (pointAX - pointBX) * (avgY - pointAY)
        ) * 0.5;

      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = data[rangeOffs];
        nextA = rangeOffs;
      }
    }

    sampled[sampledIndex++] = maxAreaPoint;
    a = nextA;
  }

  // always keep last
  sampled[sampledIndex++] = data[dataLength - 1];

  return sampled;
};

/**
 * Downsample using LTTB + dimension mapping.
 * Input: y-values only. We generate x = index.
 */
const downsampleVectorLTTB = (
  data: number[],
  configMaxPoints: number
): { values: number[]; indices: number[] } => {
  const len = data.length;
  if (len === 0) {
    return { values: [], indices: [] };
  }

  const targetPoints = chooseTargetPoints(len, configMaxPoints);

  // For very small arrays, just return as-is
  if (targetPoints >= len) {
    return {
      values: data,
      indices: data.map((_, i) => i),
    };
  }

  // Build [x, y] pairs where x = original index
  const xyData: XYPoint[] = new Array(len);
  for (let i = 0; i < len; i++) {
    xyData[i] = [i, data[i]];
  }

  const sampled = lttb(xyData, targetPoints);

  const values: number[] = new Array(sampled.length);
  const indices: number[] = new Array(sampled.length);

  for (let i = 0; i < sampled.length; i++) {
    indices[i] = sampled[i][0];
    values[i] = sampled[i][1];
  }

  return { values, indices };
};

// ─────────────────────────────────────────────────────────────────
// Hook: useDisplayVectorGraph
// ─────────────────────────────────────────────────────────────────

/**
 * Manages vector data updates with throttling + LTTB downsampling.
 */
export const useDisplayVectorGraph = (
  primary: VectorPrimary | undefined,
  cfg: UseDisplayVectorGraphConfig = {}
): UseDisplayVectorGraphResult => {
  const config = { ...DEFAULT_CONFIG, ...cfg };

  const isOffline = primary?.isOffline ?? false;

  // Get schema value type once
  const schemaValueType = useMemo(
    () => (primary ? getSchemaValueType(primary) : undefined),
    [primary]
  );

  // ─────────────────────────────────────────────────────────────────
  // Calculate throttle interval (respects both Hz and server config)
  // ─────────────────────────────────────────────────────────────────

  const throttleMs = useMemo(() => {
    const fromHz =
      config.maxUpdateHz > 0 ? 1000 / config.maxUpdateHz : Infinity;
    return Math.max(fromHz, config.propertyUpdateIntervalMs ?? 0);
  }, [config.maxUpdateHz, config.propertyUpdateIntervalMs]);

  // ─────────────────────────────────────────────────────────────────
  // Throttle raw value updates
  // ─────────────────────────────────────────────────────────────────

  const rawVectorUnthrottled =
    primary?.value ?? primary?.schemaAttrs?.defaultValue;

  const [rawVector, setRawVector] = useState<unknown>(rawVectorUnthrottled);

  const throttledUpdate = useMemo(
    () =>
      throttle((v: unknown) => setRawVector(v), throttleMs, {
        leading: true,
        trailing: true,
      }),
    [throttleMs]
  );

  useEffect(() => {
    throttledUpdate(rawVectorUnthrottled);
  }, [rawVectorUnthrottled, throttledUpdate]);

  useEffect(() => {
    return () => throttledUpdate.cancel();
  }, [throttledUpdate]);

  // When offline: cancel throttle and clear data
  useEffect(() => {
    if (!isOffline) return;

    throttledUpdate.cancel();
    setRawVector(undefined);
  }, [isOffline, throttledUpdate]);

  // Reset when property binding changes
  useEffect(() => {
    setRawVector(undefined);
  }, [primary?.deviceId, primary?.propertyPath]);

  // Normalize to number[] (once per throttled update)
  const baseVector = useMemo(
    () => normalizeVector(rawVector, schemaValueType),
    [rawVector, schemaValueType]
  );

  const rawLength = baseVector.length;

  // Downsample for chart rendering using LTTB + dimension table
  const { values: vectorData, indices } = useMemo(
    () => downsampleVectorLTTB(baseVector, config.maxPoints),
    [baseVector, config.maxPoints]
  );

  return {
    vectorData,
    indices,
    schemaValueType,
    isOffline,
    rawLength,
  };
};
