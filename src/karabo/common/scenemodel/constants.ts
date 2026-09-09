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
// XML attribute names
// ---------------------------------------------------------------------------

export const KRB_CLASS = 'class';
export const KRB_WIDGET = 'widget';
export const KRB_KEYS = 'keys';
export const KRB_VERSION = 'version';
export const KRB_UUID = 'uuid';

export const ATTR_KRB_CLASS = KRB_CLASS;
export const ATTR_KRB_WIDGET = KRB_WIDGET;
export const ATTR_KRB_KEYS = KRB_KEYS;
export const ATTR_KRB_VERSION = KRB_VERSION;
export const ATTR_KRB_UUID = KRB_UUID;
export const ATTR_WIDTH = 'width';
export const ATTR_HEIGHT = 'height';

// ---------------------------------------------------------------------------
// Scene file version
// ---------------------------------------------------------------------------

export const SCENE_FILE_VERSION = 2;
export const UNKNOWN_WIDGET_CLASS = '__unknown_widget__';

// ---------------------------------------------------------------------------
// SVG element tags
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
export const SVG_PATH = 'svg:path';
export const SVG_DEFS = 'svg:defs';
