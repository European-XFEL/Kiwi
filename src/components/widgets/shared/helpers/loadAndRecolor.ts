// ============================================================================
// SVG Recoloring Utility
// Efficiently recolors and normalizes SVG icons for stateful widgets
// ============================================================================

import {
  createPerformanceTracker,
  measureComputation,
  measureRendering,
  type PerformanceMetrics,
} from "../../../../shared/helpers/performance";

const recolorCache = new Map<string, string>();
const MAX_CACHE_SIZE = 100;

// ============================================================================
// Types
// ============================================================================

export interface RecolorOptions {
  /** Replace strokes in addition to fills (defaults to true) */
  stroke?: boolean;
  /** How to fit the SVG in its container */
  fit?: "contain" | "cover" | "fill";
  /** Keep stroke widths constant when scaling */
  nonScalingStroke?: boolean;
  /** If a file contains multiple <svg> blocks, prefer the one containing this id */
  preferSvgId?: string;
  /** Extra outer margin (as fraction of max(width,height)) to mimic Qt look; default ~6% */
  extraPadPercent?: number;
  /** Enable performance tracking and logging */
  enablePerfTracking?: boolean;
}

export interface RecolorResult {
  /** The recolored SVG string */
  svg: string;
  /** Performance metrics if tracking was enabled */
  metrics?: PerformanceMetrics;
}

// ============================================================================
// Utilities
// ============================================================================

/** Extract a clean single <svg>…</svg> (handles BOM, prologs/doctype, comments, multi-root) */
function sanitizeSvgText(input: string, preferId?: string): string {
  // Remove BOM
  let s = input.replace(/^\uFEFF/, "");

  // Extract all <svg>…</svg> blocks (if any)
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
    // Fallback: slice between the first <svg and the last </svg>
    const start = s.search(/<svg[\s>]/i);
    const end = s.toLowerCase().lastIndexOf("</svg>");
    if (start >= 0 && end >= 0) s = s.slice(start, end + 6);
  }

  // Remove XML prologs / DOCTYPE / leading comments
  s = s
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<!doctype[\s\S]*?>/gi, "")
    .replace(/^(\s*<!--[\s\S]*?-->)+/g, "")
    .trim();

  return s;
}

/** Do we see any transforms in the doc? */
function docHasTransforms(svgDoc: Document): boolean {
  return !!svgDoc.querySelector("[transform]");
}

/** Mount a cloned <svg> offscreen and measure its *transformed* content box. */
function mountAndMeasureBBox(
  svgDoc: Document,
  perfTracking = false
): DOMRect {
  return measureRendering(
    "Mount and measure BBox",
    () => {
      const svgEl = document.importNode(
        svgDoc.documentElement,
        true
      ) as unknown as SVGSVGElement;

      // Make it safe to mount
      svgEl.setAttribute("width", "0");
      svgEl.setAttribute("height", "0");
      (svgEl as unknown as HTMLElement).style.position = "absolute";
      (svgEl as unknown as HTMLElement).style.left = "-100000px";
      (svgEl as unknown as HTMLElement).style.top = "-100000px";
      (svgEl as unknown as HTMLElement).style.visibility = "hidden";

      document.body.appendChild(svgEl);

      let box: DOMRect;
      try {
        // @ts-ignore includeStroke is not in all TS libdefs yet
        box = svgEl.getBBox?.({ includeStroke: true }) ?? svgEl.getBBox();
      } catch {
        // Fallback: union of individual graphics elements
        let x1 = Infinity,
          y1 = Infinity,
          x2 = -Infinity,
          y2 = -Infinity;
        const nodes = svgEl.querySelectorAll<SVGGraphicsElement>(
          "path,rect,circle,ellipse,line,polyline,polygon,text,g,use"
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

/** Is the value white or green (colors that should be replaced)? */
function shouldRecolor(value?: string | null): boolean {
  if (!value) return false;
  // White: #fff, #ffffff, rgb(255,255,255)
  // Green: #008000, rgb(0,128,0)
  return /(#fff(fff)?\b|#008000\b|rgb\s*\(\s*255\s*,\s*255\s*,\s*255\s*\)|rgb\s*\(\s*0\s*,\s*128\s*,\s*0\s*\))/i.test(
    value
  );
}

/** Scan the document for the largest stroke-width (attr or inline style) */
function getMaxStrokeWidth(svgDoc: Document): number {
  let max = 0;
  for (const el of Array.from(svgDoc.querySelectorAll<HTMLElement>("*"))) {
    const attr = el.getAttribute("stroke-width");
    if (attr) {
      const v = parseFloat(attr);
      if (Number.isFinite(v) && v > max) max = v;
    }
    const style = el.getAttribute("style");
    if (style) {
      const m = style.match(/stroke-width\s*:\s*([0-9.]+)\b/i);
      if (m) {
        const v = parseFloat(m[1]);
        if (Number.isFinite(v) && v > max) max = v;
      }
    }
  }
  // Minimum padding + tiny fudge to avoid shaving
  return (max > 0 ? max : 1) + 0.75;
}

/** LRU-ish cache setter with a simple size cap */
function setCache(key: string, value: string): void {
  if (recolorCache.size >= MAX_CACHE_SIZE) {
    const firstKey = recolorCache.keys().next().value;
    if (firstKey) recolorCache.delete(firstKey);
  }
  recolorCache.set(key, value);
}

function getCacheKey(
  path: string,
  color: string,
  opts: RecolorOptions
): string {
  return [
    path,
    color,
    opts.stroke ? 1 : 0,
    opts.fit ?? "contain",
    opts.nonScalingStroke ? 1 : 0,
    opts.preferSvgId ?? "",
    String(opts.extraPadPercent ?? ""),
  ].join("|");
}

// ============================================================================
// Core transforms
// ============================================================================

/** Recolor fills (and optionally strokes) + gradient stops */
function recolorSvgDocument(
  svgDoc: Document,
  color: string,
  includeStrokes: boolean,
  perfTracking = false
): void {
  measureComputation(
    "Recolor SVG document",
    () => {
      const elements = Array.from(svgDoc.querySelectorAll<HTMLElement>("*"));

      for (const el of elements) {
        // fill attribute
        const fill = el.getAttribute("fill");
        if (fill && shouldRecolor(fill)) {
          el.setAttribute("fill", color);
        }

        // stroke attribute
        if (includeStrokes) {
          const stroke = el.getAttribute("stroke");
          if (stroke && shouldRecolor(stroke)) {
            el.setAttribute("stroke", color);
          }
        }

        // inline style
        const style = el.getAttribute("style");
        if (style) {
          let modified = style
            // Replace white fills
            .replace(
              /fill\s*:\s*(#fff(?:fff)?|rgb\s*\(\s*255\s*,\s*255\s*,\s*255\s*\))/gi,
              `fill:${color}`
            )
            // Replace green fills
            .replace(
              /fill\s*:\s*(#008000|rgb\s*\(\s*0\s*,\s*128\s*,\s*0\s*\))/gi,
              `fill:${color}`
            );

          if (includeStrokes) {
            modified = modified
              // Replace white strokes
              .replace(
                /stroke\s*:\s*(#fff(?:fff)?|rgb\s*\(\s*255\s*,\s*255\s*,\s*255\s*\))/gi,
                `stroke:${color}`
              )
              // Replace green strokes
              .replace(
                /stroke\s*:\s*(#008000|rgb\s*\(\s*0\s*,\s*128\s*,\s*0\s*\))/gi,
                `stroke:${color}`
              );
          }

          if (modified !== style) {
            el.setAttribute("style", modified);
          }
        }
      }

      // gradient stops
      for (const stop of Array.from(
        svgDoc.querySelectorAll<SVGStopElement>("stop")
      )) {
        const stopColor = stop.getAttribute("stop-color");
        if (stopColor && shouldRecolor(stopColor)) {
          stop.setAttribute("stop-color", color);
        }

        const stopStyle = stop.getAttribute("style");
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
            stop.setAttribute("style", modified);
          }
        }
      }
    },
    perfTracking
  );
}

/**
 * Normalize root to behave like <img> with object-fit, and prevent stroke clipping.
 * Uses real transformed bounds when needed, then pads by stroke width and a small percent.
 */
function normalizeSvgRoot(
  svgDoc: Document,
  fit: "contain" | "cover" | "fill",
  nonScalingStroke: boolean,
  extraPadPercent = 0.06, // ~6% outer margin to match Qt look
  perfTracking = false
): void {
  measureRendering(
    "Normalize SVG root",
    () => {
      const root = svgDoc.documentElement as unknown as SVGSVGElement;

      // 1) Decide how to compute bounds
      const hasVb = root.hasAttribute("viewBox");
      const mustMeasure = docHasTransforms(svgDoc) || !hasVb;

      // 2) Compute a base box
      let x = 0,
        y = 0,
        w = 0,
        h = 0;
      if (mustMeasure) {
        const b = mountAndMeasureBBox(svgDoc, perfTracking);
        x = b.x;
        y = b.y;
        w = Math.max(1e-6, b.width);
        h = Math.max(1e-6, b.height);
      } else {
        const [vx, vy, vw, vh] = (root.getAttribute("viewBox") || "0 0 0 0")
          .split(/\s+/)
          .map(Number);
        x = vx;
        y = vy;
        w = Math.max(1e-6, vw);
        h = Math.max(1e-6, vh);
      }

      // 3) Padding
      const strokePad = getMaxStrokeWidth(svgDoc);
      const percentPad = Math.max(w, h) * (extraPadPercent ?? 0.06);
      const pad = strokePad + percentPad;

      x -= pad;
      y -= pad;
      w += 2 * pad;
      h += 2 * pad;

      // 4) Apply viewBox
      root.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);

      // 5) Fill container and map "fit" to preserveAspectRatio
      root.setAttribute("width", "100%");
      root.setAttribute("height", "100%");
      const style = root.getAttribute("style");
      root.setAttribute(
        "style",
        style ? `${style};display:block` : "display:block"
      );

      const par =
        fit === "cover"
          ? "xMidYMid slice"
          : fit === "fill"
          ? "none"
          : "xMidYMid meet";
      root.setAttribute("preserveAspectRatio", par);

      // 6) Keep stroke width constant if requested
      if (nonScalingStroke) {
        for (const el of Array.from(
          svgDoc.querySelectorAll<SVGGraphicsElement>(
            "path, rect, circle, ellipse, line, polyline, polygon"
          )
        )) {
          el.setAttribute("vector-effect", "non-scaling-stroke");
        }
      }
    },
    perfTracking
  );
}

// ============================================================================
// Pipeline
// ============================================================================

/** Full recolor pipeline */
function recolorSvg(
  svgText: string,
  color: string,
  opts: RecolorOptions
): { svg: string; computationTime: number; renderingTime: number } {
  const perfTracking = opts.enablePerfTracking ?? false;
  let computationTime = 0;
  let renderingTime = 0;

  // Sanitize and parse (computation)
  const { result: cleaned, time: sanitizeTime } = measureComputation(
    "Sanitize SVG text",
    () => sanitizeSvgText(svgText, opts.preferSvgId),
    perfTracking
  );
  computationTime += sanitizeTime;

  const { result: svgDoc, time: parseTime } = measureComputation(
    "Parse SVG document",
    () => {
      const parser = new DOMParser();
      return parser.parseFromString(cleaned, "image/svg+xml");
    },
    perfTracking
  );
  computationTime += parseTime;

  const parserError = svgDoc.querySelector("parsererror");
  if (parserError) {
    console.error("SVG parsing failed:", parserError.textContent);
    return { svg: svgText, computationTime, renderingTime };
  }

  // Recolor (computation)
  const { time: recolorTime } = measureComputation(
    "Recolor SVG document",
    () => {
      recolorSvgDocument(svgDoc, color, opts.stroke ?? true, perfTracking);
    },
    perfTracking
  );
  computationTime += recolorTime;

  // Normalize (rendering)
  const { time: normalizeTime } = measureRendering(
    "Normalize SVG root",
    () => {
      normalizeSvgRoot(
        svgDoc,
        opts.fit ?? "contain",
        opts.nonScalingStroke ?? false,
        opts.extraPadPercent ?? 0.06,
        perfTracking
      );
    },
    perfTracking
  );
  renderingTime += normalizeTime;

  // Serialize (computation)
  const { result: serialized, time: serializeTime } = measureComputation(
    "Serialize SVG",
    () => new XMLSerializer().serializeToString(svgDoc),
    perfTracking
  );
  computationTime += serializeTime;

  return { svg: serialized, computationTime, renderingTime };
}

// ============================================================================
// Public API
// ============================================================================

export async function loadAndRecolorSvg(
  path: string,
  color: string,
  opts: RecolorOptions = {},
  signal?: AbortSignal
): Promise<RecolorResult> {
  const perfTracker = opts.enablePerfTracking
    ? createPerformanceTracker("SVG Load & Recolor")
    : null;

  const cacheKey = getCacheKey(path, color, opts);
  const cached = recolorCache.get(cacheKey);

  if (cached) {
    if (perfTracker) {
      perfTracker.mark("cache-hit");
      const metrics = perfTracker.getMetrics();
      metrics.fromCache = true;
      return { svg: cached, metrics };
    }
    return { svg: cached };
  }

  // Fetch the SVG file
  perfTracker?.mark("fetch-start");
  const res = await fetch(path, { signal });
  if (!res.ok) {
    throw new Error(`Failed to load SVG: ${path} (${res.status})`);
  }

  const svgText = await res.text();
  const fetchTime = perfTracker?.mark("fetch-complete") ?? 0;

  // Recolor the SVG
  perfTracker?.mark("recolor-start");
  const recolorResult = recolorSvg(svgText, color, opts);
  perfTracker?.mark("recolor-complete");

  // Cache only the SVG string
  setCache(cacheKey, recolorResult.svg);

  if (perfTracker) {
    const metrics = perfTracker.getMetrics();
    metrics.fetchTime = fetchTime;
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

export function clearRecolorCache(): void {
  recolorCache.clear();
}

/**
 * Backward-compatible alias that returns just the SVG string
 * @deprecated Use loadAndRecolorSvg for full metrics support
 */
export async function loadAndRecolor(
  path: string,
  color: string,
  opts: RecolorOptions = {},
  signal?: AbortSignal
): Promise<string> {
  const result = await loadAndRecolorSvg(path, color, opts, signal);
  return result.svg;
}

// Re-export performance utilities for convenience
export { measureComputation, measureRendering, createPerformanceTracker } from "../../../../shared/helpers/performance";
