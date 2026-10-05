import React from 'react';
import type { useChart } from './useChart';

export function useCurveVisibility({
  keys,
  chart,
}: {
  keys: readonly string[];
  chart: Pick<
    ReturnType<typeof useChart>,
    'setVisible' | 'viewport' | 'rangesRef'
  >;
}) {
  const [hiddenCurves, setHiddenCurves] = React.useState<Set<string>>(
    () => new Set()
  );
  React.useLayoutEffect(() => {
    // Run after chart creation and data updates, including recreation and reset.
    // setVisible only updates the chart when visibility actually changes.
    keys.forEach((key, index) =>
      chart.setVisible(index, !hiddenCurves.has(key))
    );
    chart.rangesRef.current = chart.viewport.readRanges(
      chart.rangesRef.current
    );
  });
  const toggleCurve = React.useCallback((key: string) => {
    setHiddenCurves((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);
  return { hiddenCurves, toggleCurve };
}
