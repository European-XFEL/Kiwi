/** Input color accepted by recolor methods: hex/css string or RGB tuple. */
type ColorInput = string | [number, number, number];

const REQUIRED_BROWSER_JS_RUNTIME =
  'ColorIcon.fromSvgText requires a web browser compatible Javascript runtime';

const ATTR_PREFIX = '@_';
const TEXT_KEY = '#text';
const COLOR_SLOT = '\uE000';
const RECOLORABLE_WHITES = new Set(['#fff', '#ffffff', 'rgb(255,255,255)']);

type ParsedNode = Record<string, unknown>;

type SharedState = {
  root: SVGSVGElement;
  fillPaths: number[][];
  strokePaths: number[][];
  stylePatches: { path: number[]; original: string; templated: string }[];
  svgCache: Map<string, string>;
};

export class ColorIcon {
  private constructor(
    private readonly shared: SharedState,
    private readonly color?: string,
    private readonly cachedViewBox?: string
  ) {}

  get parsed(): ParsedNode {
    return parseParsedSvg(this.toSvg()) ?? {};
  }

  static fromSvgText(svgText: string): ColorIcon | null {
    const root = parseSvgRoot(svgText);
    return root ? new ColorIcon(compileSvg(root)) : null;
  }

  static fromParsed(parsed: ParsedNode): ColorIcon {
    const icon = ColorIcon.fromSvgText(ColorIcon.serialize(parsed));
    if (!icon) throw new Error('Invalid parsed SVG structure');
    return icon;
  }

  static serialize(parsed: ParsedNode): string {
    if (
      typeof document === 'undefined' ||
      typeof XMLSerializer === 'undefined'
    ) {
      throw new Error(REQUIRED_BROWSER_JS_RUNTIME);
    }

    const [tagName, value] = Object.entries(parsed)[0] ?? [];
    if (!tagName || !value || typeof value !== 'object') return '';

    const xml = document.implementation.createDocument(null, '', null);
    const root = buildElement(xml, tagName, value as ParsedNode);

    if (xml.documentElement) xml.replaceChild(root, xml.documentElement);
    else xml.appendChild(root);

    return new XMLSerializer().serializeToString(xml);
  }

  withCachedViewBox(viewBox: string): ColorIcon {
    return viewBox === this.cachedViewBox
      ? this
      : new ColorIcon(this.shared, this.color, viewBox);
  }

  withColor(color: ColorInput): ColorIcon {
    const nextColor = toHexColor(color);
    return nextColor === this.color
      ? this
      : new ColorIcon(this.shared, nextColor, this.cachedViewBox);
  }

  toSvg(): string {
    return this.stringify(false);
  }

  toSvgWithViewBox(): string {
    return this.stringify(true);
  }

  private stringify(responsive: boolean): string {
    const cacheKey = `${responsive ? 1 : 0}|${this.color || ''}|${this.cachedViewBox || ''}`;
    const cached = this.shared.svgCache.get(cacheKey);
    if (cached != null) return cached;

    const svg = renderSvg(
      this.shared,
      this.color,
      this.cachedViewBox,
      responsive
    );

    this.shared.svgCache.set(cacheKey, svg);
    return svg;
  }
}

function renderSvg(
  shared: SharedState,
  color: string | undefined,
  cachedViewBox: string | undefined,
  responsive: boolean
): string {
  if (typeof XMLSerializer === 'undefined') {
    throw new Error(REQUIRED_BROWSER_JS_RUNTIME);
  }

  const svg = shared.root.cloneNode(true) as SVGSVGElement;
  applyRootAttrs(svg, cachedViewBox, responsive);

  if (color) {
    for (const path of shared.fillPaths) {
      getElementAtPath(svg, path)?.setAttribute('fill', color);
    }

    for (const path of shared.strokePaths) {
      getElementAtPath(svg, path)?.setAttribute('stroke', color);
    }

    for (const patch of shared.stylePatches) {
      getElementAtPath(svg, patch.path)?.setAttribute(
        'style',
        patch.templated.split(COLOR_SLOT).join(color)
      );
    }
  }

  return new XMLSerializer().serializeToString(svg);
}

function compileSvg(root: SVGSVGElement): SharedState {
  const fillPaths: number[][] = [];
  const strokePaths: number[][] = [];
  const stylePatches: {
    path: number[];
    original: string;
    templated: string;
  }[] = [];

  collectTargets(root, [], fillPaths, strokePaths, stylePatches);

  return {
    root,
    fillPaths,
    strokePaths,
    stylePatches,
    svgCache: new Map(),
  };
}

function collectTargets(
  element: Element,
  path: number[],
  fillPaths: number[][],
  strokePaths: number[][],
  stylePatches: { path: number[]; original: string; templated: string }[]
): void {
  const fill = element.getAttribute('fill');
  if (fill && isRecolorableWhite(fill)) fillPaths.push([...path]);

  const stroke = element.getAttribute('stroke');
  if (stroke && isRecolorableWhite(stroke)) strokePaths.push([...path]);

  const style = element.getAttribute('style');
  if (style) {
    const templated = compileStyleTemplate(style);
    if (templated) {
      stylePatches.push({ path: [...path], original: style, templated });
    }
  }

  for (let index = 0; index < element.children.length; index++) {
    collectTargets(
      element.children[index],
      [...path, index],
      fillPaths,
      strokePaths,
      stylePatches
    );
  }
}

function getElementAtPath(root: Element, path: number[]): Element | null {
  let element: Element = root;
  for (const index of path) {
    const child = element.children[index];
    if (!child) return null;
    element = child;
  }
  return element;
}

function applyRootAttrs(
  svg: SVGSVGElement,
  cachedViewBox: string | undefined,
  responsive: boolean
): void {
  svg.setAttribute('preserveAspectRatio', 'none');

  if (cachedViewBox) {
    svg.setAttribute('viewBox', cachedViewBox);
  } else if (responsive && !svg.hasAttribute('viewBox')) {
    const width = svg.getAttribute('width');
    const height = svg.getAttribute('height');
    if (width && height) svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }

  if (responsive) {
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
  }
}

function compileStyleTemplate(styleText: string): string | null {
  const parts: string[] = [];
  let changed = false;

  for (const chunk of styleText.split(';')) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex < 0) continue;

    const propertyName = trimmed.slice(0, colonIndex).trim();
    let propertyValue = trimmed.slice(colonIndex + 1).trim();

    if (
      (propertyName === 'fill' || propertyName === 'stroke') &&
      isRecolorableWhite(propertyValue)
    ) {
      propertyValue = COLOR_SLOT;
      changed = true;
    }

    parts.push(`${propertyName}:${propertyValue}`);
  }

  return changed ? parts.join(';') : null;
}

function parseXmlRoot(svgText: string): Element | null {
  if (typeof DOMParser === 'undefined') {
    throw new Error(REQUIRED_BROWSER_JS_RUNTIME);
  }
  if (!svgText.trim()) return null;

  const xml = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  return xml.querySelector('parsererror') ? null : xml.documentElement;
}

function parseSvgRoot(svgText: string): SVGSVGElement | null {
  const root = parseXmlRoot(svgText);
  if (!root) return null;
  if (root instanceof SVGSVGElement) return root;
  return root.tagName.toLowerCase() === 'svg'
    ? (root as unknown as SVGSVGElement)
    : null;
}

function parseParsedSvg(svgText: string): ParsedNode | null {
  const root = parseXmlRoot(svgText);
  return root ? { [root.nodeName]: elementToParsedNode(root) } : null;
}

function elementToParsedNode(element: Element): ParsedNode {
  const parsed: ParsedNode = {};
  const groupedChildren: Record<string, ParsedNode[]> = {};
  const textParts: string[] = [];
  let hasElementChildren = false;

  for (let index = 0; index < element.attributes.length; index++) {
    const attr = element.attributes[index];
    parsed[ATTR_PREFIX + attr.name] = attr.value;
  }

  for (let index = 0; index < element.childNodes.length; index++) {
    const childNode = element.childNodes[index];

    if (childNode.nodeType === Node.ELEMENT_NODE) {
      hasElementChildren = true;
      const child = childNode as Element;
      (groupedChildren[child.nodeName] ||= []).push(elementToParsedNode(child));
    } else if (
      childNode.nodeType === Node.TEXT_NODE ||
      childNode.nodeType === Node.CDATA_SECTION_NODE
    ) {
      textParts.push(childNode.nodeValue ?? '');
    }
  }

  for (const tagName in groupedChildren) {
    const group = groupedChildren[tagName];
    parsed[tagName] = group.length === 1 ? group[0] : group;
  }

  const text = textParts.join('');
  if (text && (text.trim() || !hasElementChildren)) parsed[TEXT_KEY] = text;

  return parsed;
}

function buildElement(
  xml: XMLDocument,
  tagName: string,
  parsed: ParsedNode
): Element {
  const element = xml.createElement(tagName);

  for (const key in parsed) {
    const value = parsed[key];

    if (key === TEXT_KEY) continue;

    if (key.startsWith(ATTR_PREFIX)) {
      element.setAttribute(key.slice(2), String(value));
      continue;
    }

    for (const child of asArray(
      value as ParsedNode | ParsedNode[] | undefined
    )) {
      if (child && typeof child === 'object') {
        element.appendChild(buildElement(xml, key, child as ParsedNode));
      }
    }
  }

  if (typeof parsed[TEXT_KEY] === 'string') {
    element.appendChild(xml.createTextNode(parsed[TEXT_KEY]));
  }

  return element;
}

function isRecolorableWhite(value: string): boolean {
  return RECOLORABLE_WHITES.has(value.trim().toLowerCase().replace(/\s+/g, ''));
}

function toHexColor(color: ColorInput): string {
  if (typeof color === 'string') return color;
  const [red, green, blue] = color;
  return `#${toHexByte(red)}${toHexByte(green)}${toHexByte(blue)}`;
}

function toHexByte(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, '0');
}

/** Normalises parsed child nodes: single child → array, missing → []. */
export function asArray<T>(value: T | T[] | undefined): T[] {
  return value == null ? [] : Array.isArray(value) ? value : [value];
}
