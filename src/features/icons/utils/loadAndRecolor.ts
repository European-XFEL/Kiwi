import {
  createPerformanceTracker,
  measureComputation,
  measureRendering,
  type PerformanceMetrics,
} from '@/shared/utils/performance';

// In-memory LRU-ish cache for recolored SVGs
const recolorCache = new Map<string, string>();
const MAX_CACHE_SIZE = 200;

export interface RecolorOptions {
  stroke?: boolean;
  fit?: 'contain' | 'cover' | 'fill';
  nonScalingStroke?: boolean;
  preferSvgId?: string;
  extraPadPercent?: number;
  enablePerfTracking?: boolean;
}

export interface RecolorResult {
  svg: string;
  metrics?: PerformanceMetrics;
}

/**
 * Take a raw string and extract a single clean <svg>...</svg> block.
 * If multiple SVGs exist, optionally pick one by id.
 * Also strips XML/doctype/comments.
 */
function sanitizeSvgText(input: string, preferId?: string): string {
  let s = input.replace(/^\uFEFF/, '');
  const allSvgs = s.match(/<svg[\s\S]*?<\/svg>/gi);
  if (allSvgs && allSvgs.length > 0) {
    if (preferId) {
      const byId = allSvgs.find(
        (x) => x.includes(`id="${preferId}"`) || x.includes(`id='${preferId}'`)
      );
      s = byId ?? allSvgs[0];
    } else {
      s = allSvgs[0];
    }
  } else {
    // fallback: try to slice first/last <svg>
    const start = s.search(/<svg[\s>]/i);
    const end = s.toLowerCase().lastIndexOf('</svg>');
    if (start >= 0 && end >= 0) s = s.slice(start, end + 6);
  }

  // remove xml/doctype/comments
  s = s
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!doctype[\s\S]*?>/gi, '')
    .replace(/^(\s*<!--[\s\S]*?-->)+/g, '')
    .trim();

  return s;
}

/**
 * Quick check: does this SVG use any transform attributes?
 * If yes, we often need to measure actual rendered bounds.
 */
function docHasTransforms(svgDoc: Document): boolean {
  return !!svgDoc.querySelector('[transform]');
}

/**
 * Temporarily mounts the SVG in the DOM (hidden) and reads its bounding box.
 * Falls back to computing a union of child BBoxes if getBBox fails.
 */
function mountAndMeasureBBox(svgDoc: Document, perfTracking = false): DOMRect {
  return measureRendering(
    'Mount and measure BBox',
    () => {
      const svgEl = document.importNode(
        svgDoc.documentElement,
        true
      ) as unknown as SVGSVGElement;

      svgEl.setAttribute('width', '0');
      svgEl.setAttribute('height', '0');
      (svgEl as unknown as HTMLElement).style.position = 'absolute';
      (svgEl as unknown as HTMLElement).style.left = '-100000px';
      (svgEl as unknown as HTMLElement).style.top = '-100000px';
      (svgEl as unknown as HTMLElement).style.visibility = 'hidden';

      document.body.appendChild(svgEl);

      let box: DOMRect;
      try {
        // @ts-ignore includeStroke not in all lib defs
        box = svgEl.getBBox?.({ includeStroke: true }) ?? svgEl.getBBox();
      } catch {
        // manual union of element BBoxes
        let x1 = Infinity,
          y1 = Infinity,
          x2 = -Infinity,
          y2 = -Infinity;
        const nodes = svgEl.querySelectorAll<SVGGraphicsElement>(
          'path,rect,circle,ellipse,line,polyline,polygon,text,g,use'
        );
        nodes.forEach((n) => {
          try {
            const b = n.getBBox();
            x1 = Math.min(x1, b.x);
            y1 = Math.min(y1, b.y);
            x2 = Math.max(x2, b.x + b.width);
            y2 = Math.max(y2, b.y + b.height);
          } catch {}
        });
        if (x1 === Infinity) {
          x1 = y1 = 0;
          x2 = y2 = 0;
        }
        box = new DOMRect(x1, y1, Math.max(0, x2 - x1), Math.max(0, y2 - y1));
      }

      svgEl.remove();
      return box;
    },
    perfTracking
  ).result;
}

/**
 * Decide if a fill/stroke value is one of the colors we want to replace
 * (current code targets white and green variants).
 */
function shouldRecolor(value?: string | null): boolean {
  if (!value) return false;
  return /(#fff(fff)?\b|#008000\b|rgb\s*\(\s*255\s*,\s*255\s*,\s*255\s*\)|rgb\s*\(\s*0\s*,\s*128\s*,\s*0\s*\))/i.test(
    value
  );
}

/**
 * Find the biggest stroke-width in the doc and add a little extra.
 * This helps padding so strokes aren't clipped.
 */
function getMaxStrokeWidth(svgDoc: Document): number {
  let max = 0;
  for (const el of Array.from(svgDoc.querySelectorAll<HTMLElement>('*'))) {
    const attr = el.getAttribute('stroke-width');
    if (attr) {
      const v = parseFloat(attr);
      if (Number.isFinite(v) && v > max) max = v;
    }
    const style = el.getAttribute('style');
    if (style) {
      const m = style.match(/stroke-width\s*:\s*([0-9.]+)\b/i);
      if (m) {
        const v = parseFloat(m[1]);
        if (Number.isFinite(v) && v > max) max = v;
      }
    }
  }
  return (max > 0 ? max : 1) + 0.75;
}

/**
 * Basic capped map insert. Oldest item is dropped when we hit max size.
 */
function setCache(key: string, value: string): void {
  if (recolorCache.size >= MAX_CACHE_SIZE) {
    const firstKey = recolorCache.keys().next().value;
    if (firstKey) recolorCache.delete(firstKey);
  }
  recolorCache.set(key, value);
}

/**
 * Make a stable cache key for preloaded SVGs.
 */
export function getPreloadedCacheKey(
  iconName: string,
  color: string,
  opts: RecolorOptions = {}
): string {
  return [
    `preloaded:${iconName}`,
    color,
    opts.stroke ? 1 : 0,
    opts.fit ?? 'contain',
    opts.nonScalingStroke ? 1 : 0,
    opts.preferSvgId ?? '',
    String(opts.extraPadPercent ?? ''),
  ].join('|');
}

/**
 * Walk the SVG document and replace fills/strokes/gradient stops that match our
 * "recolorable" pattern with the target color.
 */
function recolorSvgDocument(
  svgDoc: Document,
  color: string,
  includeStrokes: boolean,
  perfTracking = false
): void {
  measureComputation(
    'Recolor SVG document',
    () => {
      const elements = Array.from(svgDoc.querySelectorAll<HTMLElement>('*'));

      for (const el of elements) {
        const fill = el.getAttribute('fill');
        if (fill && shouldRecolor(fill)) {
          el.setAttribute('fill', color);
        }

        if (includeStrokes) {
          const stroke = el.getAttribute('stroke');
          if (stroke && shouldRecolor(stroke)) {
            el.setAttribute('stroke', color);
          }
        }

        // inline styles
        const style = el.getAttribute('style');
        if (style) {
          let modified = style
            .replace(
              /fill\s*:\s*(#fff(?:fff)?|rgb\s*\(\s*255\s*,\s*255\s*,\s*255\s*\))/gi,
              `fill:${color}`
            )
            .replace(
              /fill\s*:\s*(#008000|rgb\s*\(\s*0\s*,\s*128\s*,\s*0\s*\))/gi,
              `fill:${color}`
            );

          if (includeStrokes) {
            modified = modified
              .replace(
                /stroke\s*:\s*(#fff(?:fff)?|rgb\s*\(\s*255\s*,\s*255\s*,\s*255\s*\))/gi,
                `stroke:${color}`
              )
              .replace(
                /stroke\s*:\s*(#008000|rgb\s*\(\s*0\s*,\s*128\s*,\s*0\s*\))/gi,
                `stroke:${color}`
              );
          }

          if (modified !== style) {
            el.setAttribute('style', modified);
          }
        }
      }

      // gradients
      for (const stop of Array.from(
        svgDoc.querySelectorAll<SVGStopElement>('stop')
      )) {
        const stopColor = stop.getAttribute('stop-color');
        if (stopColor && shouldRecolor(stopColor)) {
          stop.setAttribute('stop-color', color);
        }

        const stopStyle = stop.getAttribute('style');
        if (stopStyle) {
          const modified = stopStyle
            .replace(
              /stop-color\s*:\s*(#fff(?:fff)?|rgb\s*\(\s*255\s*,\s*255\s*,\s*255\s*\))/gi,
              `stop-color:${color}`
            )
            .replace(
              /stop-color\s*:\s*(#008000|rgb\s*\(\s*0\s*,\s*128\s*,\s*0\s*\))/gi,
              `stop-color:${color}`
            );

          if (modified !== stopStyle) {
            stop.setAttribute('style', modified);
          }
        }
      }
    },
    perfTracking
  );
}

/**
 * Normalize the root <svg> so it renders nicely:
 * - ensure viewBox exists (and padded)
 * - set width/height to 100%
 * - set preserveAspectRatio based on fit
 * - optionally apply non-scaling stroke
 */
function normalizeSvgRoot(
  svgDoc: Document,
  fit: 'contain' | 'cover' | 'fill',
  nonScalingStroke: boolean,
  extraPadPercent = 0.06,
  perfTracking = false
): void {
  measureRendering(
    'Normalize SVG root',
    () => {
      const root = svgDoc.documentElement as unknown as SVGSVGElement;

      const hasVb = root.hasAttribute('viewBox');
      const mustMeasure = docHasTransforms(svgDoc) || !hasVb;

      let x = 0,
        y = 0,
        w = 0,
        h = 0;

      // figure out bounds
      if (mustMeasure) {
        const b = mountAndMeasureBBox(svgDoc, perfTracking);
        x = b.x;
        y = b.y;
        w = Math.max(1e-6, b.width);
        h = Math.max(1e-6, b.height);
      } else {
        const [vx, vy, vw, vh] = (root.getAttribute('viewBox') || '0 0 0 0')
          .split(/\s+/)
          .map(Number);
        x = vx;
        y = vy;
        w = Math.max(1e-6, vw);
        h = Math.max(1e-6, vh);
      }

      // add padding so strokes / shadows don't get clipped
      const strokePad = getMaxStrokeWidth(svgDoc);
      const percentPad = Math.max(w, h) * (extraPadPercent ?? 0.06);
      const pad = strokePad + percentPad;

      x -= pad;
      y -= pad;
      w += 2 * pad;
      h += 2 * pad;

      root.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);

      // responsive sizing
      root.setAttribute('width', '100%');
      root.setAttribute('height', '100%');
      const style = root.getAttribute('style');
      root.setAttribute(
        'style',
        style ? `${style};display:block` : 'display:block'
      );

      // map fit to preserveAspectRatio
      const par =
        fit === 'cover'
          ? 'xMidYMid slice'
          : fit === 'fill'
            ? 'none'
            : 'xMidYMid meet';
      root.setAttribute('preserveAspectRatio', par);

      // keep stroke width constant if requested
      if (nonScalingStroke) {
        for (const el of Array.from(
          svgDoc.querySelectorAll<SVGGraphicsElement>(
            'path, rect, circle, ellipse, line, polyline, polygon'
          )
        )) {
          el.setAttribute('vector-effect', 'non-scaling-stroke');
        }
      }
    },
    perfTracking
  );
}

// ============================================================================
// Pipeline
// ============================================================================

/**
 * Full "string svg -> recolored, normalized svg" pipeline.
 * Returns serialized SVG plus timing info.
 */
function recolorSvg(
  svgText: string,
  color: string,
  opts: RecolorOptions
): { svg: string; computationTime: number; renderingTime: number } {
  const perfTracking = opts.enablePerfTracking ?? false;
  let computationTime = 0;
  let renderingTime = 0;

  // 1) clean incoming text
  const { result: cleaned, time: sanitizeTime } = measureComputation(
    'Sanitize SVG text',
    () => sanitizeSvgText(svgText, opts.preferSvgId),
    perfTracking
  );
  computationTime += sanitizeTime;

  // 2) parse into DOM
  const { result: svgDoc, time: parseTime } = measureComputation(
    'Parse SVG document',
    () => {
      const parser = new DOMParser();
      return parser.parseFromString(cleaned, 'image/svg+xml');
    },
    perfTracking
  );
  computationTime += parseTime;

  const parserError = svgDoc.querySelector('parsererror');
  if (parserError) {
    console.error('SVG parsing failed:', parserError.textContent);
    return { svg: svgText, computationTime, renderingTime };
  }

  // 3) recolor elements
  const { time: recolorTime } = measureComputation(
    'Recolor SVG document',
    () => {
      recolorSvgDocument(svgDoc, color, opts.stroke ?? true, perfTracking);
    },
    perfTracking
  );
  computationTime += recolorTime;

  // 4) normalize root
  const { time: normalizeTime } = measureRendering(
    'Normalize SVG root',
    () => {
      normalizeSvgRoot(
        svgDoc,
        opts.fit ?? 'contain',
        opts.nonScalingStroke ?? false,
        opts.extraPadPercent ?? 0.06,
        perfTracking
      );
    },
    perfTracking
  );
  renderingTime += normalizeTime;

  // 5) serialize back to string
  const { result: serialized, time: serializeTime } = measureComputation(
    'Serialize SVG',
    () => new XMLSerializer().serializeToString(svgDoc),
    perfTracking
  );
  computationTime += serializeTime;

  return { svg: serialized, computationTime, renderingTime };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Recolors a preloaded SVG string.
 * Tries cache first; if miss, runs pipeline and stores result.
 */
export function recolorPreloadedSvg(
  svgText: string,
  color: string,
  cacheKey: string,
  opts: RecolorOptions = {}
): RecolorResult {
  const perfTracker = opts.enablePerfTracking
    ? createPerformanceTracker('SVG Recolor (Preloaded)')
    : null;

  // cache check
  const cached = recolorCache.get(cacheKey);
  if (cached) {
    if (perfTracker) {
      perfTracker.mark('cache-hit');
      const metrics = perfTracker.getMetrics();
      metrics.fromCache = true;
      return { svg: cached, metrics };
    }
    return { svg: cached, metrics: { fromCache: true } };
  }

  // cache miss -> recolor
  perfTracker?.mark('recolor-start');
  const recolorResult = recolorSvg(svgText, color, opts);
  perfTracker?.mark('recolor-complete');

  // store
  setCache(cacheKey, recolorResult.svg);

  if (perfTracker) {
    const metrics = perfTracker.getMetrics();
    metrics.computationTime = recolorResult.computationTime;
    metrics.renderingTime = recolorResult.renderingTime;
    metrics.fromCache = false;

    if (opts.enablePerfTracking) {
      perfTracker.logSummary();
    }

    return { svg: recolorResult.svg, metrics };
  }

  return { svg: recolorResult.svg };
}

/**
 * Clear all recolored SVGs from memory.
 */
export function clearRecolorCache(): void {
  recolorCache.clear();
}

/**
 * Get number of items currently in the recolor cache.
 */
export function getRecolorCacheSize(): number {
  return recolorCache.size;
}

// Re-export performance utilities for convenience
export {
  measureComputation,
  measureRendering,
  createPerformanceTracker,
} from '@/shared/utils/performance';
