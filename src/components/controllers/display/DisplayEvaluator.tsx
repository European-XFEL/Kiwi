import React from "react";
import type { EvaluatorProps } from "@/scene/scene_types/controllers/display";
import { ControllerContainer } from "@/components/sceneView/ControllerContainer";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/fontDefaults";
import { useDeviceProperty } from "@/components/shared/hooks/useDeviceProperty";
import { HashTypes } from "karabo-ts";

/**
 * ---- helpers to mimic the Python evaluator from the Qt GUI ----
 */

/**
 * Format a numeric value with optional format specification.
 * Supports format strings like:
 *  - ""            → default precision (8 sig figs for floats)
 *  - ".2f"         → fixed(2)
 *  - ".3f"         → fixed(3)
 *  - ".1e"         → exponential(1)
 */
function formatNumber(value: number, fmt: string): string {
  // No format specified - apply default precision for floats
  if (fmt === "" || fmt == null) {
    // Default to 8 significant figures (matching GUI Client behavior)
    const num = Number(value);
    if (Number.isNaN(num)) {
      return String(value);
    }
    return parseFloat(num.toPrecision(8)).toString();
  }

  // remove leading ':' or similar
  let spec = fmt.replace(/^:/, "");

  // e.g. ".2f"
  const m = spec.match(/^\.(\d+)([ef])$/);
  if (m) {
    const decimals = parseInt(m[1], 10);
    const kind = m[2];
    if (kind === "f") {
      return value.toFixed(decimals);
    }
    if (kind === "e") {
      return value.toExponential(decimals);
    }
  }

  // ".0f"
  const m2 = spec.match(/^\.(\d+)$/);
  if (m2) {
    const decimals = parseInt(m2[1], 10);
    return value.toFixed(decimals);
  }

  return String(value);
}

/**
 * Parse `"abc {:.2f} Hz ({:.1e})".format(x, x*2)`
 * – supports multiple args
 * – supports the simple numeric format codes from the scene
 */
function handlePythonFormatCall(expr: string, x: any): string | null {
  // "....".format(...)
  const m = expr.match(/^["']([\s\S]+?)["']\.format\(([\s\S]*)\)$/);
  if (!m) return null;

  const template = m[1];
  const argsSrc = m[2].trim();

  // split args by "," (your scene only uses very simple args)
  const argsList = argsSrc ? argsSrc.split(",").map((s) => s.trim()) : [];

  // evaluate each arg (they are stuff like "x", "x * 100", "abs(x)", also "x" reused)
  const jsArgs = argsList.map((arg) => evaluateSmallPythonExpr(arg, x));

  let argIndex = 0;
  const out = template.replace(/\{([^}]*)\}/g, (_m, fmtPart) => {
    const val = jsArgs[argIndex++];
    const numVal = typeof val === "number" ? val : Number(val);
    if (!isNaN(numVal)) {
      return formatNumber(numVal, fmtPart);
    }
    return String(val);
  });

  return out;
}

/**
 * handle python ternary:
 * "ON" if x else "OFF"
 * "HIGH" if x > 5 else "LOW"
 * "CRITICAL" if x > 10 else "WARN" if x > 5 else "OK"
 */
function handlePythonTernary(expr: string, x: any): string | number | boolean {
  // this will only handle the leftmost ternary and recurse on the right
  const i = expr.indexOf(" if ");
  const j = expr.indexOf(" else ");
  if (i === -1 || j === -1 || j < i) {
    // not actually a ternary
    return evaluateSmallPythonExpr(expr, x);
  }

  const truePart = expr.slice(0, i).trim();
  const conditionPart = expr.slice(i + 4, j).trim();
  const falsePart = expr.slice(j + 6).trim();

  const cond = Boolean(evaluateSmallPythonExpr(conditionPart, x));
  if (cond) {
    return evaluatePythonishExpression(truePart, x);
  }
  // false part might itself be a ternary
  return evaluatePythonishExpression(falsePart, x);
}

/**
 * Very small subset of "python to js" to evaluate arithmetic parts
 * used inside .format(...) args and ternary conditions.
 */
function evaluateSmallPythonExpr(src: string, x: any): any {
  let s = src.trim();

  // str(x)[:10]
  const sliceMatch = s.match(/^str\(x\)\[:(\d+)\]$/);
  if (sliceMatch) {
    const len = parseInt(sliceMatch[1], 10);
    return String(x).slice(0, len);
  }

  // str(x).upper()
  if (s === "str(x).upper()") {
    return String(x).toUpperCase();
  }

  // str(x).lower()
  if (s === "str(x).lower()") {
    return String(x).toLowerCase();
  }

  // "⚡ {:.1f} Hz" kind of literals are handled earlier, but if someone writes just "foo"
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }

  // replace python funcs / names with JS ones
  s = s
    .replace(/\babs\(/g, "Math.abs(")
    .replace(/\band\b/g, "&&")
    .replace(/\bor\b/g, "||")
    .replace(/\bnot\b/g, "!")
    .replace(/\bstr\(x\)/g, "String(x)");

  // most of your arithmetic is valid JS already: x * 100, x / 10, x ** 2, x > 5
  // eslint-disable-next-line no-new-func
  const fn = new Function("x", `return (${s});`);
  return fn(x);
}

/**
 * Top-level evaluator
 * tries:
 *   1. python-style string .format(...)
 *   2. python ternary "... if ... else ..."
 *   3. plain small expression
 */
function evaluatePythonishExpression(expr: string, x: any): string {
  const trimmed = expr.trim();

  // 1. format calls
  const maybeFormat = handlePythonFormatCall(trimmed, x);
  if (maybeFormat !== null) {
    return String(maybeFormat);
  }

  // 2. ternary
  if (trimmed.includes(" if ") && trimmed.includes(" else ")) {
    const v = handlePythonTernary(trimmed, x);
    return String(v);
  }

  // 3. plain small arithmetic / string op
  const v = evaluateSmallPythonExpr(trimmed, x);
  return String(v);
}

/**
 * ---- React component ----
 */
const Evaluator: React.FC<EvaluatorProps> = (props) => {
  const primaryKey = props.keys[0] ?? "";
  const { value, model } = useDeviceProperty(primaryKey);

  const displayValue = React.useMemo(() => {
    // what the device actually reports
    const rawValue =
      value ?? model?.property_schema?.schemaAttrs?.defaultValue ?? 0;

    const expr = props.expression || "";

    // if no expression, apply default formatting for floats
    if (!expr.trim()) {
      const propType = model?.property_schema?.schemaAttrs?.valueType;

      // Float types: format with default precision (8 sig figs)
      if (propType === HashTypes.Float32 || propType === HashTypes.Float64) {
        const num = Number(rawValue);
        if (Number.isNaN(num)) {
          return String(rawValue);
        }
        return parseFloat(num.toPrecision(8)).toString();
      }

      // Non-float types: just show string representation
      return String(rawValue);
    }

    try {
      return evaluatePythonishExpression(expr, rawValue);
    } catch (err) {
      // fall back to raw if something blows up
      console.warn("Evaluator expression error:", err);
      return String(rawValue);
    }
  }, [value, model, props.expression]);

  return (
    <ControllerContainer
      keys={props.keys}
      x={props.x}
      y={props.y}
      width={props.width}
      height={props.height}
      showMissingPropertyOverlay
      className="overflow-clip flex items-center justify-center border border-solid px-1"
    >
      <span
        style={{
          width: "100%",
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          display: "block",
          fontFamily: FONT_FAMILY_DEFAULT,
          fontSize: props.font_size,
          fontWeight: props.font_weight.toLowerCase(),
        }}
      >
        {displayValue}
      </span>
    </ControllerContainer>
  );
};

export default Evaluator;
