export type PerfLogFn = (msg: string, meta?: Record<string, unknown>) => void;

const defaultLogger: PerfLogFn = (msg, meta) => {
  if (meta) {
    console.log(msg, meta);
  } else {
    console.log(msg);
  }
};

export const isPerfEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;

  const w = window as any;

  if (typeof w.__VECTOR_GRAPH_PERF__ === 'boolean')
    return w.__VECTOR_GRAPH_PERF__;
  if (typeof w.__PERF__ === 'boolean') return w.__PERF__;

  return false;
};

export const perfMark = (name: string): void => {
  if (!isPerfEnabled()) return;
  performance.mark(name);
};

export const perfMeasure = (
  label: string,
  startMark: string,
  endMark: string,
  log: PerfLogFn = defaultLogger,
  meta?: Record<string, unknown>
): number => {
  if (!isPerfEnabled()) return 0;

  // Check if start mark exists before measuring
  const marks = performance.getEntriesByName(startMark, 'mark');
  if (marks.length === 0) {
    // Start mark doesn't exist - skip measurement silently
    return 0;
  }

  performance.mark(endMark);
  performance.measure(label, startMark, endMark);

  const entries = performance.getEntriesByName(label);
  const last = entries[entries.length - 1];
  const duration = last ? last.duration : 0;

  log(`${label}: ${duration.toFixed(2)}ms`, meta);

  performance.clearMarks(startMark);
  performance.clearMarks(endMark);
  performance.clearMeasures(label);

  return duration;
};
