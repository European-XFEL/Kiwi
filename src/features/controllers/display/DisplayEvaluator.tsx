/**
 * DisplayEvaluator - controller component
 * NOTE: Evaluator is Deprecated
 */

import React from 'react';
import type { EvaluatorProps } from '@/scene/scene_types/controllers/display';
import { FONT_FAMILY_DEFAULT } from '../utils/fontDefaults';
import { HashTypes } from '@/karabo-hash/typenums';

function coerceFloat(val: unknown): string {
  const num = typeof val === 'number' ? val : Number(val);
  return Number.isNaN(num)
    ? String(val)
    : parseFloat(num.toPrecision(8)).toString();
}

function toDisplayString(value: unknown, hashType?: number): string {
  if (value === undefined) return '';
  if (value === null) return 'null';

  const isFloatType =
    hashType === HashTypes.Float32 || hashType === HashTypes.Float64;

  return isFloatType ? coerceFloat(value) : String(value);
}

const CLASS_NAME_EVALUATOR =
  'overflow-clip flex items-center justify-center border border-solid px-1 w-full h-full';

const CLASS_NAME_VALUE =
  'w-full text-center overflow-hidden whitespace-nowrap text-ellipsis';

const Evaluator: React.FC<EvaluatorProps> = ({
  font_size,
  font_weight,
  tooltipText,
  disabledReason,
  primary,
}) => {
  const displayValue = React.useMemo(() => {
    return toDisplayString(primary?.value, (primary as any)?.hashType);
  }, [primary?.value, (primary as any)?.hashType]);

  return (
    <div className={CLASS_NAME_EVALUATOR} title={tooltipText || disabledReason}>
      <span
        className={CLASS_NAME_VALUE}
        style={{
          fontFamily: FONT_FAMILY_DEFAULT,
          fontSize: font_size,
          fontWeight: font_weight?.toLowerCase(),
        }}
      >
        {displayValue}
      </span>
    </div>
  );
};

export default Evaluator;
