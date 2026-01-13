export function buildTimeValueHeatmap(
  timestampsMs: number[],
  values: number[],
  opts?: {
    timeBins?: number; // columns
    valueBins?: number; // rows
    valueMin?: number;
    valueMax?: number;
  }
) {
  const timeBins = opts?.timeBins ?? 24;
  const valueBins = opts?.valueBins ?? 10;

  if (timestampsMs.length === 0 || values.length === 0) {
    return { xLabels: [], yLabels: [], z: [] as number[][] };
  }

  const tMin = Math.min(...timestampsMs);
  const tMax = Math.max(...timestampsMs);
  const vMin = opts?.valueMin ?? Math.min(...values);
  const vMax = opts?.valueMax ?? Math.max(...values);

  const z = Array.from({ length: valueBins }, () =>
    Array.from({ length: timeBins }, () => 0)
  );

  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));

  for (let i = 0; i < timestampsMs.length; i++) {
    const t = timestampsMs[i];
    const v = values[i];

    const tx =
      tMax === tMin
        ? 0
        : Math.floor(((t - tMin) / (tMax - tMin)) * (timeBins - 1));
    const vy =
      vMax === vMin
        ? 0
        : Math.floor(((v - vMin) / (vMax - vMin)) * (valueBins - 1));

    const cx = clamp(tx, 0, timeBins - 1);
    const cy = clamp(vy, 0, valueBins - 1);
    z[cy][cx] += 1;
  }

  const xLabels = Array.from({ length: timeBins }, (_, i) => i.toString());
  const yLabels = Array.from({ length: valueBins }, (_, i) => i.toString());

  return { xLabels, yLabels, z };
}
