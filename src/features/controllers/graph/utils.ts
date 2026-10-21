const GENERAL_TICK_PRECISION = 6;
const TICK_SPACING_PRECISION = 12;

export function formatValueTick(value: number, spacing?: number) {
  if (spacing) {
    // Remove subtraction noise before logarithms choose the decimal precision.
    spacing = Number(spacing.toPrecision(TICK_SPACING_PRECISION));
  }
  const magnitude = Math.abs(value);
  // Like AxisItem.tickStrings, derive fixed-point decimals from tick spacing
  // and use compact general notation for small and large magnitudes.
  if (spacing && magnitude >= 0.001 && magnitude < 10000) {
    const places = Math.min(20, Math.max(0, Math.ceil(-Math.log10(spacing))));
    return value.toFixed(places);
  }
  let precision = GENERAL_TICK_PRECISION;
  if (spacing && magnitude > 0) {
    // Keep close large ticks distinct when zoomed beyond six significant digits.
    precision = Math.min(
      17,
      Math.max(
        precision,
        Math.floor(Math.log10(magnitude)) - Math.floor(Math.log10(spacing)) + 1
      )
    );
  }
  const rounded = Number(value.toPrecision(precision));
  const exponent = Math.floor(Math.log10(Math.abs(rounded)));
  if (rounded !== 0 && (exponent < -4 || exponent >= precision)) {
    return rounded.toExponential();
  }
  return String(rounded);
}

export const GRAPH_AXIS_FONT = {
  family: 'Source Sans Pro, sans-serif',
  size: 13.333,
};

export function axisTitle(label: string, units: string) {
  return [label, units ? `(${units})` : ''].filter(Boolean).join(' ');
}

export function roundedTickSpacing(maximumSpacing: number) {
  const unit = 10 ** Math.floor(Math.log10(maximumSpacing));
  let spacing = unit;
  if (maximumSpacing >= 5 * unit) {
    spacing *= 5;
  } else if (maximumSpacing >= 2 * unit) {
    spacing *= 2;
  }
  return spacing;
}
