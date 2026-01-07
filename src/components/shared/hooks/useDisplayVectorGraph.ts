import { useMemo } from 'react';
import type { DisplayVectorGraphProps } from '@/scene/scene_types/controllers/display';
import {
  schemaSaysVector,
  type SchemaValueType,
} from '@/shared/helpers/validation_helpers/schema_type_identifier';
import { downsampleArray } from '@/shared/helpers/lttb';
import { perfMark, perfMeasure } from '@/shared/helpers/perf';

export type VectorPrimary = DisplayVectorGraphProps['primary'];

export interface UseDisplayVectorGraphConfig {
  defaultThreshold?: number;
}

export const DEFAULT_CONFIG: Required<UseDisplayVectorGraphConfig> = {
  defaultThreshold: 20_000,
};

export interface UseDisplayVectorGraphResult {
  vectorData: number[];
  indices: number[];
  schemaValueType?: SchemaValueType;
  isOffline: boolean;
  rawLength: number;
  downsampleTimeMs: number; // Time spent in LTTB downsampling
}

const DIMENSION_DOWNSAMPLE: Array<{ size: number; points: number }> = [
  { size: 200_000, points: 30_000 },
  { size: 300_000, points: 40_000 },
  { size: 400_000, points: 50_000 },
  { size: 500_000, points: 60_000 },
];

const chooseTargetPoints = (
  length: number,
  defaultThreshold: number
): number => {
  let target = defaultThreshold;
  for (const rule of DIMENSION_DOWNSAMPLE) {
    if (length >= rule.size) target = rule.points;
  }
  return Math.min(target, length);
};

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

const normalizeVector = (
  raw: unknown,
  schemaValueType?: SchemaValueType
): number[] => {
  if (!raw) return [];

  const schemaKnowsVector = schemaSaysVector(schemaValueType);
  const isRuntimeVectorShape =
    Array.isArray(raw) ||
    (ArrayBuffer.isView(raw) && !(raw instanceof DataView));

  if (!schemaKnowsVector && !isRuntimeVectorShape) return [];

  if (ArrayBuffer.isView(raw) && !(raw instanceof DataView)) {
    try {
      const arr = Array.from(raw as any);
      return arr.map(toNumberSafe).filter((v): v is number => v != null);
    } catch {
      return [];
    }
  }

  if (Array.isArray(raw)) {
    return raw.map(toNumberSafe).filter((v): v is number => v != null);
  }

  return [];
};

const downsampleVectorLTTB = (
  data: number[],
  defaultThreshold: number
): {
  values: number[];
  indices: number[];
  targetPoints: number;
  timeMs: number;
} => {
  const len = data.length;
  if (len === 0) return { values: [], indices: [], targetPoints: 0, timeMs: 0 };

  const targetPoints = chooseTargetPoints(len, defaultThreshold);

  perfMark('vector_downsample_start');
  const res = downsampleArray(data, targetPoints);
  const timeMs = perfMeasure(
    'vector_downsample',
    'vector_downsample_start',
    'vector_downsample_end',
    undefined,
    {
      rawLength: len,
      targetPoints,
    }
  );

  return { ...res, targetPoints, timeMs };
};

export const useDisplayVectorGraph = (
  primary: VectorPrimary | undefined,
  cfg: UseDisplayVectorGraphConfig = {}
): UseDisplayVectorGraphResult => {
  const config = { ...DEFAULT_CONFIG, ...cfg };

  const isOffline = primary?.isOffline ?? false;

  const schemaValueType = useMemo(
    () => (primary ? getSchemaValueType(primary) : undefined),
    [primary]
  );

  const rawValue = primary?.value ?? primary?.schemaAttrs?.defaultValue;

  const baseVector = useMemo(
    () => normalizeVector(rawValue, schemaValueType),
    [rawValue, schemaValueType]
  );

  const rawLength = baseVector.length;

  const {
    values: vectorData,
    indices,
    timeMs: downsampleTimeMs,
  } = useMemo(() => {
    return downsampleVectorLTTB(baseVector, config.defaultThreshold);
  }, [baseVector, config.defaultThreshold]);

  return {
    vectorData,
    indices,
    schemaValueType,
    isOffline,
    rawLength,
    downsampleTimeMs,
  };
};
