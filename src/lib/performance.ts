// ============================================================================
// Performance Measurement Utilities
// Helper functions for measuring computation and rendering performance
// ============================================================================

export interface PerformanceMetrics {
  /** Total time from start to finish (ms) */
  totalTime?: number;
  /** Time spent on computation operations (ms) */
  computationTime?: number;
  /** Time spent on rendering operations (ms) */
  renderingTime?: number;
  /** Additional custom timings and metadata */
  [key: string]: number | boolean | undefined;
}

export interface MeasurementResult<T> {
  result: T;
  time: number;
}

/**
 * Helper to measure computation performance
 * @param label - Description of the operation being measured
 * @param fn - Function to measure
 * @param verbose - Whether to log to console (default: false)
 * @returns Object with result and elapsed time in ms
 *
 * @example
 * const { result, time } = measureComputation('Parse SVG', () => parser.parse(svg));
 * console.log(`Parsing took ${time}ms`);
 */
export function measureComputation<T>(
  label: string,
  fn: () => T,
  verbose = false
): MeasurementResult<T> {
  const start = performance.now();
  const result = fn();
  const time = performance.now() - start;

  if (verbose || process.env.NODE_ENV === 'development') {
    console.debug(`[Computation] ${label}: ${time.toFixed(2)}ms`);
  }

  return { result, time };
}

/**
 * Helper to measure async computation performance
 * @param label - Description of the operation being measured
 * @param fn - Async function to measure
 * @param verbose - Whether to log to console (default: false)
 * @returns Promise with object containing result and elapsed time in ms
 *
 * @example
 * const { result, time } = await measureComputationAsync('Fetch data', () => fetch(url));
 */
export async function measureComputationAsync<T>(
  label: string,
  fn: () => Promise<T>,
  verbose = false
): Promise<MeasurementResult<T>> {
  const start = performance.now();
  const result = await fn();
  const time = performance.now() - start;

  if (verbose || process.env.NODE_ENV === 'development') {
    console.debug(`[Computation] ${label}: ${time.toFixed(2)}ms`);
  }

  return { result, time };
}

/**
 * Helper to measure rendering performance (DOM operations)
 * @param label - Description of the operation being measured
 * @param fn - Function to measure
 * @param verbose - Whether to log to console (default: false)
 * @returns Object with result and elapsed time in ms
 *
 * @example
 * const { result, time } = measureRendering('Mount and measure', () => mountSvg());
 */
export function measureRendering<T>(
  label: string,
  fn: () => T,
  verbose = false
): MeasurementResult<T> {
  const start = performance.now();
  const result = fn();
  const time = performance.now() - start;

  if (verbose || process.env.NODE_ENV === 'development') {
    console.debug(`[Rendering] ${label}: ${time.toFixed(2)}ms`);
  }

  return { result, time };
}

/**
 * Helper to measure async rendering performance
 * @param label - Description of the operation being measured
 * @param fn - Async function to measure
 * @param verbose - Whether to log to console (default: false)
 * @returns Promise with object containing result and elapsed time in ms
 */
export async function measureRenderingAsync<T>(
  label: string,
  fn: () => Promise<T>,
  verbose = false
): Promise<MeasurementResult<T>> {
  const start = performance.now();
  const result = await fn();
  const time = performance.now() - start;

  if (verbose || process.env.NODE_ENV === 'development') {
    console.debug(`[Rendering] ${label}: ${time.toFixed(2)}ms`);
  }

  return { result, time };
}

/**
 * Create a performance tracker for complex operations
 * @param operationName - Name of the overall operation
 * @returns Performance tracker object
 *
 * @example
 * const perf = createPerformanceTracker('SVG Recolor');
 * perf.mark('parse');
 * // ... parsing code
 * perf.mark('recolor');
 * // ... recoloring code
 * perf.mark('done');
 * const metrics = perf.getMetrics();
 * console.log(metrics); // { parse: 5.2, recolor: 12.3, total: 17.5 }
 */
export function createPerformanceTracker(operationName: string) {
  const marks: Map<string, number> = new Map();
  const startTime = performance.now();
  let lastMark = startTime;

  return {
    /**
     * Mark a point in time and measure elapsed time since last mark
     * @param label - Label for this measurement point
     * @returns Time elapsed since last mark (ms)
     */
    mark(label: string): number {
      const now = performance.now();
      const elapsed = now - lastMark;
      marks.set(label, elapsed);
      lastMark = now;

      if (process.env.NODE_ENV === 'development') {
        console.debug(`[${operationName}] ${label}: ${elapsed.toFixed(2)}ms`);
      }

      return elapsed;
    },

    /**
     * Get all metrics including total time
     * @returns Object with all marked times and total
     */
    getMetrics(): PerformanceMetrics {
      const metrics: PerformanceMetrics = {
        totalTime: performance.now() - startTime,
      };

      marks.forEach((time, label) => {
        metrics[label] = time;
      });

      return metrics;
    },

    /**
     * Log a summary of all metrics
     */
    logSummary(): void {
      const metrics = this.getMetrics();
      console.group(`[Performance] ${operationName}`);
      Object.entries(metrics).forEach(([key, value]) => {
        if (value !== undefined) {
          if (typeof value === 'number') {
            console.log(`  ${key}: ${value.toFixed(2)}ms`);
          } else {
            console.log(`  ${key}: ${value}`);
          }
        }
      });
      console.groupEnd();
    },
  };
}
