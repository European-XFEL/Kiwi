import { useMemo } from 'react';
import type { DisplayVectorGraphProps } from '@/scene/scene_types/controllers/display';
import {
  schemaSaysVector,
  type SchemaValueType,
} from '@/features/controllers/utils/validation/hashTypeIdentifiers';
import { downsampleArray } from '../utils/lttb';

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
}

const DIMENSION_DOWNSAMPLE: Array<{ size: number; points: number }> = [
  { size: 200_000, points: 30_000 },
  { size: 300_000, points: 40_000 },
  { size: 400_000, points: 50_000 },
  { size: 500_000, points: 60_000 },
];

const chooseTargetPoints = (length: number, defaultThreshold: number) => {
  let target = defaultThreshold;
  for (const rule of DIMENSION_DOWNSAMPLE) {
    if (length >= rule.size) target = rule.points;
  }
  return Math.min(target, length);
};

const getSchemaValueType = (
  primary: VectorPrimary
): SchemaValueType | undefined =>
  (primary as any)?.valueType ?? primary?.binding?.hashType;

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
      return Array.from(raw as any)
        .map(toNumberSafe)
        .filter((v): v is number => v != null);
    } catch {
      return [];
    }
  }

  if (Array.isArray(raw)) {
    return raw.map(toNumberSafe).filter((v): v is number => v != null);
  }

  return [];
};

const downsampleVectorLTTB = (data: number[], defaultThreshold: number) => {
  const len = data.length;
  if (len === 0) return { values: [], indices: [] as number[] };

  const targetPoints = chooseTargetPoints(len, defaultThreshold);
  return downsampleArray(data, targetPoints);
};

export const useDisplayVectorGraph = (
  primary: VectorPrimary | undefined,
  cfg: UseDisplayVectorGraphConfig = {}
): UseDisplayVectorGraphResult => {
  const { defaultThreshold } = { ...DEFAULT_CONFIG, ...cfg };

  const isOffline = primary?.isOffline ?? false;

  const schemaValueType = useMemo(
    () => (primary ? getSchemaValueType(primary) : undefined),
    [primary]
  );

  const rawValue = primary?.value;

  const baseVector = useMemo(
    () => normalizeVector(rawValue, schemaValueType),
    [rawValue, schemaValueType]
  );

  const rawLength = baseVector.length;

  const { values: vectorData, indices } = useMemo(
    () => downsampleVectorLTTB(baseVector, defaultThreshold),
    [baseVector, defaultThreshold]
  );

  return {
    vectorData,
    indices,
    schemaValueType,
    isOffline,
    rawLength,
  };
};
