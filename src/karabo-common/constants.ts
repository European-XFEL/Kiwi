/**
 * constants.ts
 *
 * Scene namespaces and constants.
 */

// ---------------------------------------------------------------------------
// XML Namespace URIs (the actual namespace strings)
// ---------------------------------------------------------------------------

export const NS_KARABO = 'http://karabo.eu/scene';
export const NS_SVG = 'http://www.w3.org/2000/svg';
export const NS_XLINK = 'http://www.w3.org/1999/xlink';
export const NS_INKSCAPE = 'http://www.inkscape.org/namespaces/inkscape';

// ---------------------------------------------------------------------------
// Karabo attribute keys (as they appear in parsed XML/JSON)
// ---------------------------------------------------------------------------

// Raw XML attribute names (used when writing scenes back to XML)
export const KRB_CLASS = 'krb:class';
export const KRB_WIDGET = 'krb:widget';
export const KRB_KEYS = 'krb:keys';

// After xml2js parsing (prefixed with @_)
export const ATTR_KRB_CLASS = '@_krb:class';
export const ATTR_KRB_WIDGET = '@_krb:widget';
export const ATTR_KRB_KEYS = '@_krb:keys';
