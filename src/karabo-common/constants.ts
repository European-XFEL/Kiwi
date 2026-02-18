/**
 * constants.ts
 *
 * Scene namespaces and constants.
 */

// ---------------------------------------------------------------------------
// XML Namespace URIs — used in xmlns declarations when writing XML
// ---------------------------------------------------------------------------

export const NS_KARABO = 'http://karabo.eu/scene';
export const NS_SVG = 'http://www.w3.org/2000/svg';
export const NS_XLINK = 'http://www.w3.org/1999/xlink';
export const NS_INKSCAPE = 'http://www.inkscape.org/namespaces/inkscape';

// ---------------------------------------------------------------------------
// Karabo attribute names — raw XML (for writing) vs parsed JSON (for reading)
//
// fast-xml-parser prefixes all attributes with @_ on parse.
// The krb: namespace prefix is preserved as-is.
// ---------------------------------------------------------------------------

// Raw XML (writing)
export const KRB_CLASS = 'krb:class';
export const KRB_WIDGET = 'krb:widget';
export const KRB_KEYS = 'krb:keys';
export const KRB_VERSION = 'krb:version';
export const KRB_UUID = 'krb:uuid';

// Parsed JSON (reading)
export const ATTR_KRB_CLASS = '@_krb:class';
export const ATTR_KRB_WIDGET = '@_krb:widget';
export const ATTR_KRB_KEYS = '@_krb:keys';
export const ATTR_KRB_VERSION = '@_krb:version';
export const ATTR_KRB_UUID = '@_krb:uuid';
export const ATTR_WIDTH = '@_width';
export const ATTR_HEIGHT = '@_height';

// ---------------------------------------------------------------------------
// Scene file version
// ---------------------------------------------------------------------------

export const SCENE_FILE_VERSION = 2;
export const UNKNOWN_WIDGET_CLASS = '__unknown_widget__';

// ---------------------------------------------------------------------------
// SVG element tags — the JSON keys when walking parsed scene data
//
// svg:rect  — widgets (Label, DisplayCommand, etc.) and simple shapes (Rectangle)
// svg:g     — containers: layouts (BoxLayout, FixedLayout) and compound shapes (ArrowPolygon)
// svg:line  — line shapes
// svg:polygon — polygon shapes, arrow heads
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Font defaults — raw Qt descriptor format
// ---------------------------------------------------------------------------

export const FONT_DEFAULT = 'Source Sans Pro,10,-1,5,50,0,0,0,0,0';
export const FONT_SIZE_DEFAULT = 10;

export const SVG_SVG = 'svg:svg';
export const SVG_RECT = 'svg:rect';
export const SVG_G = 'svg:g';
export const SVG_LINE = 'svg:line';
export const SVG_POLYGON = 'svg:polygon';
