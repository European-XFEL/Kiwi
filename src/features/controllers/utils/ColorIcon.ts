/** Input color accepted by recolor methods: hex/css string or RGB tuple. */
type ColorInput = string | [number, number, number];

const REQUIRED_BROWSER_JS_RUNTIME =
  'ColorIcon class requires a web browser compatible Javascript runtime';

// ColorIcon
// ----------------------------------------------------------------------------

export class ColorIcon {
  /** Parsed SVG document as a plain JS object. */
  readonly parsed: Record<string, unknown>;

  private constructor(parsed: Record<string, unknown>) {
    this.parsed = parsed;
  }

  static fromSvgText(svgText: string): ColorIcon | null {
    const parsed = ColorIcon._parse(svgText);
    return parsed ? new ColorIcon(parsed) : null;
  }

  static fromParsed(parsed: Record<string, unknown>): ColorIcon {
    return new ColorIcon(deepClone(parsed));
  }

  private static _parse(svgText: string): Record<string, unknown> | null {
    return parseXml(svgText);
  }

  static serialize(parsed: Record<string, unknown>): string {
    return serializeXml(parsed);
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

    return ColorIcon.serialize({ svg: svgNode });
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

function parseXml(xmlText: string): Record<string, unknown> | null {
  if (typeof DOMParser === 'undefined') {
    throw new Error(REQUIRED_BROWSER_JS_RUNTIME);
  }
  if (!xmlText?.trim()) return null;

  const document = new DOMParser().parseFromString(xmlText, 'image/svg+xml');
  if (document.querySelector('parsererror')) return null;

  const root = document.documentElement;
  if (!root) return null;

  return { [root.nodeName]: elementToObject(root) };
}

function elementToObject(element: Element): Record<string, unknown> {
  const parsedNode: Record<string, unknown> = {};

  for (const attribute of Array.from(element.attributes)) {
    parsedNode[`@_${attribute.name}`] = attribute.value;
  }

  const childElementsByName = new Map<string, Record<string, unknown>[]>();
  const textChunks: string[] = [];
  let hasElementChild = false;

  for (const childNode of Array.from(element.childNodes)) {
    if (childNode.nodeType === Node.ELEMENT_NODE) {
      hasElementChild = true;
      const childElement = childNode as Element;
      const siblings = childElementsByName.get(childElement.nodeName) ?? [];
      siblings.push(elementToObject(childElement));
      childElementsByName.set(childElement.nodeName, siblings);
      continue;
    }

    if (
      childNode.nodeType === Node.TEXT_NODE ||
      childNode.nodeType === Node.CDATA_SECTION_NODE
    ) {
      textChunks.push(childNode.nodeValue ?? '');
    }
  }

  for (const [childName, childNodes] of childElementsByName) {
    parsedNode[childName] =
      childNodes.length === 1 ? childNodes[0] : childNodes;
  }

  const textContent = textChunks.join('');
  if (textContent && (textContent.trim() || !hasElementChild)) {
    parsedNode['#text'] = textContent;
  }

  return parsedNode;
}

function serializeXml(parsed: Record<string, unknown>): string {
  if (typeof document === 'undefined' || typeof XMLSerializer === 'undefined') {
    throw new Error(REQUIRED_BROWSER_JS_RUNTIME);
  }

  const [rootName, rootValue] = Object.entries(parsed)[0] ?? [];
  if (!rootName || !rootValue || typeof rootValue !== 'object') return '';

  const xmlDocument = document.implementation.createDocument(null, '', null);
  const root = buildElement(
    xmlDocument,
    rootName,
    rootValue as Record<string, unknown>
  );

  const placeholder = xmlDocument.documentElement;
  if (placeholder) {
    xmlDocument.replaceChild(root, placeholder);
  } else {
    xmlDocument.appendChild(root);
  }
  return new XMLSerializer().serializeToString(xmlDocument);
}

function buildElement(
  xmlDocument: XMLDocument,
  tagName: string,
  parsedNode: Record<string, unknown>
): Element {
  const element = xmlDocument.createElement(tagName);

  for (const [key, value] of Object.entries(parsedNode)) {
    if (key === '#text') continue;
    if (key.startsWith('@_')) {
      element.setAttribute(key.slice(2), String(value));
      continue;
    }

    for (const childNode of asArray(
      value as Record<string, unknown> | Record<string, unknown>[]
    )) {
      if (!childNode || typeof childNode !== 'object') continue;
      element.appendChild(buildElement(xmlDocument, key, childNode));
    }
  }

  if (typeof parsedNode['#text'] === 'string') {
    element.appendChild(xmlDocument.createTextNode(parsedNode['#text']));
  }

  return element;
}

/** Normalises parsed child nodes: single child → array, missing → []. */
export function asArray<T>(v: T | T[] | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}
