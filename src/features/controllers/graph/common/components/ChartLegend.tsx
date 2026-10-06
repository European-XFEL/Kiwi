import { TRACE_COLORS } from '../constants';

export function ChartLegend({
  keys,
  view,
}: {
  keys: readonly string[];
  view: {
    hiddenCurves: ReadonlySet<string>;
    toggleCurve: (key: string) => void;
  };
}) {
  const hiddenCurves = view.hiddenCurves;
  const toggleCurve = view.toggleCurve;
  if (keys.length < 2) {
    return null;
  }
  return (
    <div
      className="flex flex-col gap-1 rounded-sm border border-black bg-slate-200/20 p-1 text-xs text-black"
      aria-label="Graph legend"
    >
      {keys.map((key, index) => (
        <button
          key={key}
          type="button"
          aria-pressed={!hiddenCurves.has(key)}
          onClick={() => toggleCurve(key)}
          className="flex items-center gap-1"
          style={{ opacity: hiddenCurves.has(key) ? 0.4 : 1 }}
        >
          <span
            className="inline-block h-3 w-3"
            style={{
              backgroundColor: TRACE_COLORS[index % TRACE_COLORS.length],
            }}
          />
          {key}
        </button>
      ))}
    </div>
  );
}
