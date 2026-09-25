import { useEffect, useRef, useState } from 'react';
import { PropertyProxy, ProxyStatus } from '@/lib/binding/api';
import type { HashType } from '@/karabo/data/typenums';
import { isTypedArray } from '@/karabo/data/api';
import { useIdleScheduler } from './useIdleScheduler';

export type VectorProxy = PropertyProxy | undefined;
export type VectorData = ArrayLike<number>;

export interface UseDisplayVectorGraphResult {
  values: VectorData;
  schemaValueType?: HashType;
  isOffline: boolean;
  rawLength: number;
}

const getSchemaValueType = (proxy: VectorProxy): HashType | undefined =>
  proxy?.binding?.hashType;

const normalizeVector = (raw: unknown): VectorData => {
  if (!raw) return new Float64Array();

  if (isTypedArray(raw)) {
    if (!(raw instanceof BigInt64Array) && !(raw instanceof BigUint64Array))
      return raw;
  } else if (!Array.isArray(raw)) {
    return new Float64Array();
  }

  const normalized = new Float64Array(raw.length);
  for (let index = 0; index < raw.length; index++) {
    normalized[index] = Number(raw[index]);
  }
  return normalized;
};

export const useDisplayVectorGraph = (
  proxy: VectorProxy
): UseDisplayVectorGraphResult => {
  const isOffline =
    (proxy?.root.status ?? ProxyStatus.OFFLINE) === ProxyStatus.OFFLINE;
  const schemaValueType = getSchemaValueType(proxy);
  const rawValue = proxy?.value;
  const latestValue = useRef(rawValue);
  latestValue.current = rawValue;
  const schedulePublish = useIdleScheduler(1000);
  const [published, setPublished] = useState<
    Pick<UseDisplayVectorGraphResult, 'values' | 'rawLength'>
  >(() => ({
    values: new Float64Array(),
    rawLength: 0,
  }));

  useEffect(() => {
    if (isOffline) return;
    schedulePublish(() => {
      const values = normalizeVector(latestValue.current);
      setPublished({ values, rawLength: values.length });
    });
  }, [isOffline, rawValue, schedulePublish]);

  return {
    ...published,
    schemaValueType,
    isOffline,
  };
};
