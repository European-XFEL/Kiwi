import { XMLParser, XMLBuilder } from 'fast-xml-parser';

// Shared builder instance
const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: false,
  suppressEmptyNode: false,
  suppressBooleanAttributes: false,
});

/** Input color accepted by recolor methods: hex/css string or RGB tuple. */
type ColorInput = string | [number, number, number];

// ColorIcon
// ----------------------------------------------------------------------------

export class ColorIcon {
  /** Parsed SVG document as a plain JS object (fast-xml-parser output). */
  readonly parsed: Record<string, unknown>;

  private constructor(parsed: Record<string, unknown>) {
    this.parsed = parsed;
  }

  static fromSvgText(svgText: string): ColorIcon | null {
    const parsed = ColorIcon.parse(svgText);
    return parsed ? new ColorIcon(parsed) : null;
  }

  static fromParsed(parsed: Record<string, unknown>): ColorIcon {
    return new ColorIcon(deepClone(parsed));
  }

  static parse(svgText: string): Record<string, unknown> | null {
    if (!svgText?.trim()) return null;

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: false,
      trimValues: false,
      parseAttributeValue: false,
    });

    try {
      return parser.parse(svgText) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  static serialize(parsed: Record<string, unknown>): string {
    return builder.build(parsed);
  }

  /** Returns a new ColorIcon with the viewBox baked into its parsed node. */
  withCachedViewBox(viewBox: string): ColorIcon {
    const cloned = deepClone(this.parsed);
    const svgNode = cloned['svg'] as Record<string, unknown> | undefined;
    if (svgNode) svgNode['@_viewBox'] = viewBox;
    return new ColorIcon(cloned);
  }

  toSvg(): string {
    return ColorIcon.serialize(this.parsed);
  }

  toSvgWithViewBox(): string {
    const svgNode = { ...(this.parsed['svg'] as Record<string, unknown>) };

    // viewBox is pre-baked at bootstrap — fall back to authored dimensions if missing.
    if (!svgNode['@_viewBox']) {
      const w = svgNode['@_width'];
      const h = svgNode['@_height'];
      if (w && h) svgNode['@_viewBox'] = `0 0 ${w} ${h}`;
    }

    svgNode['@_width'] = '100%';
    svgNode['@_height'] = '100%';

    return builder.build({ svg: svgNode });
  }

  withColor(color: ColorInput): ColorIcon {
    const cloned = deepClone(this.parsed);
    const svgNode = cloned['svg'] as Record<string, unknown> | undefined;
    if (!svgNode) return new ColorIcon(cloned);

    recolorNodeTree(svgNode, toHexColor(color));
    return new ColorIcon(cloned);
  }
}

// Recolor helpers
// ----------------------------------------------------------------------------

/** Colors treated as recolorable state placeholders. */
const RECOLORABLE = new Set([
  '#fff',
  '#ffffff',
  'rgb(255,255,255)',
  'rgb(255, 255, 255)',
]);

/** Walk the full SVG tree and recolor fill/stroke attributes and inline style values. */
function recolorNodeTree(node: Record<string, unknown>, color: string): void {
  if (typeof node['@_fill'] === 'string' && shouldRecolor(node['@_fill'])) {
    node['@_fill'] = color;
  }
  if (typeof node['@_stroke'] === 'string' && shouldRecolor(node['@_stroke'])) {
    node['@_stroke'] = color;
  }
  if (typeof node['@_style'] === 'string') {
    node['@_style'] = recolorStyle(node['@_style'], color);
  }

  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('@_') || key === '#text') continue;
    for (const item of asArray(value as unknown[] | undefined)) {
      if (item && typeof item === 'object') {
        recolorNodeTree(item as Record<string, unknown>, color);
      }
    }
  }
}

/** Rewrites `fill`/`stroke` style declarations when they match recolorable values. */
function recolorStyle(styleText: string, color: string): string {
  const styleMap = new Map<string, string>();

  for (const chunk of styleText.split(';')) {
    const pair = chunk.trim();
    if (!pair) continue;
    const idx = pair.indexOf(':');
    if (idx < 0) continue;
    styleMap.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }

  const fill = styleMap.get('fill');
  if (fill && shouldRecolor(fill)) styleMap.set('fill', color);

  const stroke = styleMap.get('stroke');
  if (stroke && shouldRecolor(stroke)) styleMap.set('stroke', color);

  return Array.from(styleMap.entries())
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
}

/** True when a color string belongs to the recolorable placeholder palette. */
function shouldRecolor(value: string): boolean {
  return RECOLORABLE.has(value.trim());
}

/** Normalizes `ColorInput` into a hex string. */
function toHexColor(color: ColorInput): string {
  if (typeof color === 'string') return color;
  const [r, g, b] = color;
  return `#${byte(r)}${byte(g)}${byte(b)}`;
}

/** Clamp and convert a single 0..255 channel to two-digit hex. */
function byte(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, '0');
}

/** Simple deep clone for parsed JSON-like SVG objects. */
function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/** Normalises fast-xml-parser output: single child → array, missing → []. */
export function asArray<T>(v: T | T[] | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}
