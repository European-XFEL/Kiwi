/**
 * DisplayEvaluator - controller component
 * Evaluator is Deprecated
 *
 */

import React from 'react';
import type { EvaluatorProps } from '@/scene/scene_types/controllers/display';
import { FONT_FAMILY_DEFAULT } from '../utils/fontDefaults';
import { HashTypes } from 'karabo-ts';

/**
 * Default float formatting aligned with Karabo GUI:
 * - 8 significant digits
 */
const defaultFloatFormat = (val: number): string =>
  parseFloat(val.toPrecision(8)).toString();

/**
 * Formats a numeric value with an optional Python-ish format spec.
 */
function formatNumber(value: number, fmt?: string): string {
  const spec = (fmt ?? '').replace(/^:/, '').trim();
  if (!spec) return defaultFloatFormat(value);

  const ef = spec.match(/^\.(\d+)([ef])$/);
  if (ef) {
    const decimals = Number.parseInt(ef[1], 10);
    return ef[2] === 'f'
      ? value.toFixed(decimals)
      : value.toExponential(decimals);
  }

  const fixed = spec.match(/^\.(\d+)$/);
  if (fixed) {
    const decimals = Number.parseInt(fixed[1], 10);
    return value.toFixed(decimals);
  }

  return String(value);
}

/**
 * Minimal Python-ish evaluator for tiny expressions used in scenes.
 */
function evaluateSmallPythonExpr(src: string, x: unknown): unknown {
  let s = src.trim();

  const sliceMatch = s.match(/^str\(x\)\[:(\d+)\]$/);
  if (sliceMatch) {
    const len = Number.parseInt(sliceMatch[1], 10);
    return String(x).slice(0, len);
  }

  if (s === 'str(x).upper()') return String(x).toUpperCase();
  if (s === 'str(x).lower()') return String(x).toLowerCase();

  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }

  s = s
    .replace(/\babs\(/g, 'Math.abs(')
    .replace(/\band\b/g, '&&')
    .replace(/\bor\b/g, '||')
    .replace(/\bnot\b/g, '!')
    .replace(/\bstr\(x\)/g, 'String(x)');

  // eslint-disable-next-line no-new-func
  const fn = new Function('x', `return (${s});`);
  return fn(x);
}

function handlePythonFormatCall(expr: string, x: unknown): string | null {
  const m = expr.match(/^["']([\s\S]+?)["']\.format\(([\s\S]*)\)$/);
  if (!m) return null;

  const template = m[1];
  const argsSrc = m[2].trim();

  const argsList = argsSrc ? argsSrc.split(',').map((s) => s.trim()) : [];
  const jsArgs = argsList.map((arg) => evaluateSmallPythonExpr(arg, x));

  let idx = 0;
  const out = template.replace(/\{([^}]*)\}/g, (_m, fmtPart) => {
    const val = jsArgs[idx++];
    const num = typeof val === 'number' ? val : Number(val);

    if (!Number.isNaN(num)) {
      return formatNumber(num, fmtPart);
    }
    return String(val);
  });

  return out;
}

function handlePythonTernary(expr: string, x: unknown): unknown {
  const i = expr.indexOf(' if ');
  const j = expr.indexOf(' else ');
  if (i === -1 || j === -1 || j < i) {
    return evaluateSmallPythonExpr(expr, x);
  }

  const truePart = expr.slice(0, i).trim();
  const condPart = expr.slice(i + 4, j).trim();
  const falsePart = expr.slice(j + 6).trim();

  const cond = Boolean(evaluateSmallPythonExpr(condPart, x));
  return cond
    ? evaluateSmallPythonExpr(truePart, x)
    : evaluateSmallPythonExpr(falsePart, x);
}

function evaluateExpression(
  expr: string,
  x: unknown
): { evaluated: unknown; explicitFormat: boolean } {
  const trimmed = expr.trim();

  const formatted = handlePythonFormatCall(trimmed, x);
  if (formatted !== null) {
    return { evaluated: formatted, explicitFormat: true };
  }

  if (trimmed.includes(' if ') && trimmed.includes(' else ')) {
    return {
      evaluated: handlePythonTernary(trimmed, x),
      explicitFormat: false,
    };
  }

  return {
    evaluated: evaluateSmallPythonExpr(trimmed, x),
    explicitFormat: false,
  };
}

/**
 * Evaluator - Container-first controller component
 */
const Evaluator: React.FC<EvaluatorProps> = ({
  expression,
  font_size,
  font_weight,
  tooltipText,
  disabledReason,
  primary,
}) => {
  const value = primary?.value;
  const propertyModel = primary?.propertyModel;
  const schemaAttrs = primary?.schemaAttrs ?? propertyModel?.schema.schemaAttrs;

  const displayValue = React.useMemo(() => {
    const rawValue = value ?? schemaAttrs?.defaultValue ?? 0;

    const expr = (expression ?? '').trim();
    const valueType = schemaAttrs?.valueType;

    const isFloatType =
      valueType === HashTypes.Float32 || valueType === HashTypes.Float64;

    const maybeFormatFloat = (v: unknown) => {
      if (!isFloatType) return String(v);
      const num = typeof v === 'number' ? v : Number(v);
      return Number.isNaN(num) ? String(v) : defaultFloatFormat(num);
    };

    if (!expr) {
      return maybeFormatFloat(rawValue);
    }

    try {
      const { evaluated, explicitFormat } = evaluateExpression(expr, rawValue);

      if (explicitFormat) return String(evaluated);

      return maybeFormatFloat(evaluated);
    } catch (err) {
      console.warn('Evaluator expression error:', err);
      return String(rawValue);
    }
  }, [value, schemaAttrs, expression]);

  return (
    <div
      className="overflow-clip flex items-center justify-center border border-solid px-1 w-full h-full"
      title={tooltipText || disabledReason}
    >
      <span
        style={{
          width: '100%',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          display: 'block',
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
