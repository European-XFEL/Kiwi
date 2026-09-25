import { useCallback, useState } from 'react';
import type { GraphMouseTool } from '../components/display/GraphToolbar';
import type { Range } from './trendChartConfig';

export function useVectorGraphView() {
  const [tool, setTool] = useState<GraphMouseTool>('pointer');
  const [ranges, setRanges] = useState<{ x: Range; y: Range }>();
  const [resetRevision, setResetRevision] = useState(0);

  const selectTool = useCallback(
    (next: GraphMouseTool) =>
      setTool((current) => (current === next ? 'pointer' : next)),
    []
  );
  const pause = useCallback((x: Range, y: Range) => setRanges({ x, y }), []);
  const reset = useCallback(() => {
    setRanges(undefined);
    setResetRevision((current) => current + 1);
  }, []);

  return { tool, selectTool, ranges, resetRevision, pause, reset };
}
