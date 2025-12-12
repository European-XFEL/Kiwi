// Dynamically parses svg:* nodes → normalized scene JSON.
// Works with registry builders (no hardcoded widget list).

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const toBool = (v: any, def = false) => {
  if (v == null) return def;
  const s = String(v).toLowerCase();
  return s === 'true' || s === '1';
};

const toNum = (v: any, def = 0) => {
  const n = parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : def;
};

// -----------------------------------------------------------------------------
// Shapes
// -----------------------------------------------------------------------------

/** ArrowPolygon = combined line + polygon */
function parseArrowPolygon(line: any, polygon: any): any {
  const points = (polygon?.['@_points'] || '').trim().split(/\s+/);

  let [hx1, hy1, hx2, hy2] = [0, 0, 0, 0];
  if (points.length >= 3) {
    const [p1, p2] = [points[1].split(','), points[2].split(',')];
    hx1 = parseFloat(p1[0] || '0');
    hy1 = parseFloat(p1[1] || '0');
    hx2 = parseFloat(p2[0] || '0');
    hy2 = parseFloat(p2[1] || '0');
  }

  return {
    element_type: 'shape',
    shape_type: 'ArrowPolygon',
    x1: parseFloat(line?.['@_x1'] || '0'),
    y1: parseFloat(line?.['@_y1'] || '0'),
    x2: parseFloat(line?.['@_x2'] || '0'),
    y2: parseFloat(line?.['@_y2'] || '0'),
    hx1,
    hy1,
    hx2,
    hy2,
    stroke: line?.['@_stroke'] || 'none',
    fill: polygon?.['@_fill'] || 'none',
    stroke_width: parseFloat(line?.['@_stroke-width'] || '1.0'),
    stroke_opacity: parseFloat(line?.['@_stroke-opacity'] || '1.0'),
    fill_opacity: parseFloat(polygon?.['@_fill-opacity'] || '1.0'),
  };
}

// -----------------------------------------------------------------------------
// Recursive parsing
// -----------------------------------------------------------------------------

/** Parse svg:* children within a node */
export function parseSceneChildren(node: any): any[] {
  const out: any[] = [];

  const parseList = (val: any, tag: string) => {
    if (Array.isArray(val)) {
      val.forEach((v) => {
        const child = parseElement(v, tag);
        if (child) out.push(child);
      });
    } else {
      const child = parseElement(val, tag);
      if (child) out.push(child);
    }
  };

  for (const [key, val] of Object.entries(node ?? {})) {
    if (key.startsWith('svg:')) parseList(val, key);
  }

  return out;
}

/** Parse a single element */
export function parseElement(elem: any, tag: string): any | null {
  const krbClass = elem?.['@_krb:class'];
  const krbWidget = elem?.['@_krb:widget'];

  // -----------------------------
  // Layout containers
  // -----------------------------
  if (tag === 'svg:g' && krbClass) {
    if (['BoxLayout', 'FixedLayout', 'GridLayout'].includes(krbClass)) {
      return {
        element_type: 'layout',
        layout_type: krbClass,
        x: parseFloat(elem['@_krb:x'] || '0'),
        y: parseFloat(elem['@_krb:y'] || '0'),
        width: parseFloat(elem['@_krb:width'] || '0'),
        height: parseFloat(elem['@_krb:height'] || '0'),
        direction:
          krbClass === 'BoxLayout'
            ? parseInt(elem['@_krb:direction'] || '0', 10)
            : undefined,
        children: parseSceneChildren(elem),
      };
    }

    if (krbClass === 'ArrowPolygonModel') {
      const { ['svg:line']: line, ['svg:polygon']: polygon } = elem;
      if (line && polygon) return parseArrowPolygon(line, polygon);
    }
  }

  // -----------------------------
  // Rects: labels, controllers, or rectangles
  // -----------------------------
  if (tag === 'svg:rect') {
    // Static label
    if (krbClass === 'Label' && !krbWidget) {
      const fontDescriptor = elem['@_krb:font'];

      return {
        element_type: 'widget',
        widget_type: 'Label',
        x: toNum(elem['@_x']),
        y: toNum(elem['@_y']),
        width: toNum(elem['@_width']),
        height: toNum(elem['@_height']),
        text: elem['@_krb:text'] || '',
        foreground: elem['@_krb:foreground'] || '#000000',
        background: elem['@_krb:background'] || 'transparent',
        frame_width: toNum(elem['@_krb:frameWidth']),
        // Pass full Qt font descriptor if present (will be parsed by builder)
        font_descriptor: fontDescriptor,
        // Also support numeric alignment from XML
        alignh: elem['@_krb:alignh']
          ? parseInt(elem['@_krb:alignh'])
          : undefined,
      };
    }

    // ArrowPolygon embedded in a rect
    if (krbClass === 'ArrowPolygonModel') {
      const { ['svg:line']: line, ['svg:polygon']: polygon } = elem;
      if (line && polygon) return parseArrowPolygon(line, polygon);
    }

    // Controller widgets (Display/Editable)
    if (krbClass && krbWidget) {
      return {
        element_type: 'widget',
        widget_type: krbWidget,
        parent_component: krbClass,
        x: toNum(elem['@_x']),
        y: toNum(elem['@_y']),
        width: toNum(elem['@_width']),
        height: toNum(elem['@_height']),
        keys: String(elem['@_krb:keys'] ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        requires_confirmation: toBool(elem['@_krb:requires_confirmation']),
        show_string: toBool(elem['@_krb:show_string']),
        icon_name: elem['@_krb:icon_name'],

        // DoubleLineEdit extras
        decimals:
          elem['@_krb:decimals'] != null
            ? toNum(elem['@_krb:decimals'])
            : undefined,

        // Evaluator
        expression: elem['@_expression'],

        // DisplayTableElement extras
        resizeToContents: toBool(elem['@_krb:resizeToContents']),

        // TrendGraph extras
        x_label: elem['@_krb:x_label'],
        y_label: elem['@_krb:y_label'],
        x_units: elem['@_krb:x_units'],
        y_units: elem['@_krb:y_units'],
        x_grid: toBool(elem['@_krb:x_grid']),
        y_grid: toBool(elem['@_krb:y_grid']),
        x_log: toBool(elem['@_krb:x_log']),
        y_log: toBool(elem['@_krb:y_log']),
        x_invert: toBool(elem['@_krb:x_invert']),
        y_invert: toBool(elem['@_krb:y_invert']),
        x_min: toNum(elem['@_krb:x_min']),
        x_max: toNum(elem['@_krb:x_max']),
        y_min: toNum(elem['@_krb:y_min']),
        y_max: toNum(elem['@_krb:y_max']),
        x_autorange: toBool(elem['@_krb:x_autorange'], true),
        y_autorange: toBool(elem['@_krb:y_autorange'], true),
        title: elem['@_krb:title'],
        background: elem['@_krb:background'],
      };
    }

    // Simple rectangle shape
    if (!krbClass) {
      return {
        element_type: 'shape',
        shape_type: 'Rectangle',
        x: toNum(elem['@_x']),
        y: toNum(elem['@_y']),
        width: toNum(elem['@_width']),
        height: toNum(elem['@_height']),
        stroke: elem['@_stroke'] || 'none',
        fill: elem['@_fill'] || 'none',
        stroke_width: toNum(elem['@_stroke-width'], 1.0),
        stroke_opacity: toNum(elem['@_stroke-opacity'], 1.0),
      };
    }
  }

  // -----------------------------
  // Lines
  // -----------------------------
  if (tag === 'svg:line') {
    return {
      element_type: 'shape',
      shape_type: 'Line',
      x1: toNum(elem['@_x1']),
      y1: toNum(elem['@_y1']),
      x2: toNum(elem['@_x2']),
      y2: toNum(elem['@_y2']),
      stroke: elem['@_stroke'] || 'none',
      stroke_width: toNum(elem['@_stroke-width'], 1.0),
      stroke_opacity: toNum(elem['@_stroke-opacity'], 1.0),
    };
  }

  // -----------------------------
  // Polygons
  // -----------------------------
  if (tag === 'svg:polygon') {
    return {
      element_type: 'shape',
      shape_type: 'Polygon',
      points: elem['@_points'] || '',
      stroke: elem['@_stroke'] || 'none',
      fill: elem['@_fill'] || '#000000',
      stroke_width: toNum(elem['@_stroke-width'], 1.0),
      stroke_opacity: toNum(elem['@_stroke-opacity'], 1.0),
      fill_opacity: toNum(elem['@_fill-opacity'], 1.0),
    };
  }

  return null;
}
