/** Input color accepted by recolor methods: hex/css string or RGB tuple. */
export type ColorInput = string | [number, number, number];
export type ParsedNode = Record<string, unknown>;

const REQUIRED_BROWSER_JS_RUNTIME =
  'ColorIcon requires a web browser compatible Javascript runtime';
const ATTR_PREFIX = '@_';
const TEXT_KEY = '#text';
const COLOR_SLOT = '\uE000'; // Private Use Area character token
const RECOLORABLE_WHITES = new Set(['#fff', '#ffffff', 'rgb(255,255,255)']);

type SharedState = {
  rootTemplate: SVGSVGElement;
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
    assertBrowserRuntime();
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

    if (this.shared.svgCache.has(cacheKey)) {
      return this.shared.svgCache.get(cacheKey)!;
    }

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

// --- Core Rendering & Compilation ---

function compileSvg(root: SVGSVGElement): SharedState {
  // Tokenize all recolorable targets in one pass
  const elements = [root, ...Array.from(root.querySelectorAll('*'))];

  for (const el of elements) {
    if (isRecolorableWhite(el.getAttribute('fill')))
      el.setAttribute('fill', COLOR_SLOT);
    if (isRecolorableWhite(el.getAttribute('stroke')))
      el.setAttribute('stroke', COLOR_SLOT);

    const style = el.getAttribute('style');
    if (style) {
      const templated = compileStyleTemplate(style);
      if (templated) el.setAttribute('style', templated);
    }
  }

  return { rootTemplate: root, svgCache: new Map() };
}

function renderSvg(
  shared: SharedState,
  color: string | undefined,
  cachedViewBox: string | undefined,
  responsive: boolean
): string {
  assertBrowserRuntime();

  const svg = shared.rootTemplate.cloneNode(true) as SVGSVGElement;

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

  const svgText = new XMLSerializer().serializeToString(svg);
  // Inject the requested color, or revert to white if none is provided
  return svgText.split(COLOR_SLOT).join(color || '#fff');
}

function compileStyleTemplate(styleText: string): string | null {
  let changed = false;
  const templated = styleText.replace(
    /(fill|stroke)\s*:\s*([^;]+)/gi,
    (match, prop, val) => {
      if (isRecolorableWhite(val)) {
        changed = true;
        return `${prop}:${COLOR_SLOT}`;
      }
      return match;
    }
  );
  return changed ? templated : null;
}

// --- DOM Parsing & Ast Building ---

function parseXmlRoot(svgText: string): Element | null {
  assertBrowserRuntime();
  if (!svgText.trim()) return null;
  const xml = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  return xml.querySelector('parsererror') ? null : xml.documentElement;
}

function parseSvgRoot(svgText: string): SVGSVGElement | null {
  const root = parseXmlRoot(svgText);
  return root?.nodeName.toLowerCase() === 'svg'
    ? (root as SVGSVGElement)
    : null;
}

function parseParsedSvg(svgText: string): ParsedNode | null {
  const root = parseXmlRoot(svgText);
  return root ? { [root.nodeName]: elementToParsedNode(root) } : null;
}

function elementToParsedNode(element: Element): ParsedNode {
  const parsed: ParsedNode = {};
  const groupedChildren: Record<string, ParsedNode[]> = {};
  let text = '';

  for (const { name, value } of Array.from(element.attributes)) {
    parsed[ATTR_PREFIX + name] = value;
  }

  for (const childNode of Array.from(element.childNodes)) {
    if (childNode.nodeType === Node.ELEMENT_NODE) {
      const child = childNode as Element;
      (groupedChildren[child.nodeName] ||= []).push(elementToParsedNode(child));
    } else if (
      childNode.nodeType === Node.TEXT_NODE ||
      childNode.nodeType === Node.CDATA_SECTION_NODE
    ) {
      text += childNode.nodeValue ?? '';
    }
  }

  for (const [tagName, group] of Object.entries(groupedChildren)) {
    parsed[tagName] = group.length === 1 ? group[0] : group;
  }

  if (text.trim() || Object.keys(groupedChildren).length === 0) {
    if (text) parsed[TEXT_KEY] = text;
  }

  return parsed;
}

function buildElement(
  xml: XMLDocument,
  tagName: string,
  parsed: ParsedNode
): Element {
  const element = xml.createElement(tagName);

  for (const [key, value] of Object.entries(parsed)) {
    if (key === TEXT_KEY) continue;

    if (key.startsWith(ATTR_PREFIX)) {
      element.setAttribute(key.slice(2), String(value));
      continue;
    }

    for (const child of asArray(value as ParsedNode | ParsedNode[])) {
      if (child && typeof child === 'object') {
        element.appendChild(buildElement(xml, key, child));
      }
    }
  }

  if (typeof parsed[TEXT_KEY] === 'string') {
    element.appendChild(xml.createTextNode(parsed[TEXT_KEY]));
  }

  return element;
}

// --- Utilities ---

function assertBrowserRuntime() {
  if (
    typeof document === 'undefined' ||
    typeof DOMParser === 'undefined' ||
    typeof XMLSerializer === 'undefined'
  ) {
    throw new Error(REQUIRED_BROWSER_JS_RUNTIME);
  }
}

function isRecolorableWhite(value: string | null): boolean {
  if (!value) return false;
  return RECOLORABLE_WHITES.has(value.replace(/\s+/g, '').toLowerCase());
}

function toHexColor(color: ColorInput): string {
  if (typeof color === 'string') return color;
  return (
    '#' +
    color
      .map((c) =>
        Math.max(0, Math.min(255, Math.round(c)))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

export function asArray<T>(value: T | T[] | undefined): T[] {
  return value == null ? [] : Array.isArray(value) ? value : [value];
}
