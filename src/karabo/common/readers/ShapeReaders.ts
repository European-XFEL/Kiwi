/**
 * Shape readers — Rectangle, Line, Polygon, etc.
 *
 * Shapes have no krb:class — identified by SVG tag alone.
 */

import { registerReader } from '../Registry';
import {
  ArrowPolygonModel,
  LineModel,
  PolygonModel,
  RectangleModel,
} from '../models';
import { SVG_LINE, SVG_POLYGON, SVG_RECT } from '../constants';
import { readBaseShapeData, toNum, toStr } from '../readers/util';

// Rectangle
// ----------------------------------------------------------------------------

registerReader(
  'Rectangle',
  (json) => {
    const rect = new RectangleModel();

    rect.x = toNum(json['@_x']);
    rect.y = toNum(json['@_y']);
    rect.width = toNum(json['@_width']);
    rect.height = toNum(json['@_height']);
    readBaseShapeData(json, rect);

    return rect;
  },
  SVG_RECT
);

// Line
// ----------------------------------------------------------------------------

registerReader(
  'Line',
  (json) => {
    const line = new LineModel();

    line.x1 = toNum(json['@_x1']);
    line.y1 = toNum(json['@_y1']);
    line.x2 = toNum(json['@_x2']);
    line.y2 = toNum(json['@_y2']);
    readBaseShapeData(json, line);

    return line;
  },
  SVG_LINE
);

// Polygon
// ----------------------------------------------------------------------------

registerReader(
  'Polygon',
  (json) => {
    const polygon = new PolygonModel();

    polygon.points = toStr(json['@_points']);
    readBaseShapeData(json, polygon);

    return polygon;
  },
  SVG_POLYGON
);

// ArrowPolygon
// ----------------------------------------------------------------------------

registerReader('ArrowPolygonModel', (json) => {
  const arrow = new ArrowPolygonModel();

  // ArrowPolygon is a compound shape: svg:g containing svg:line + svg:polygon
  const lineJson = (json[SVG_LINE] ?? {}) as Record<string, unknown>;
  const polyJson = (json[SVG_POLYGON] ?? {}) as Record<string, unknown>;

  // Line endpoints
  arrow.x1 = toNum(lineJson['@_x1']);
  arrow.y1 = toNum(lineJson['@_y1']);
  arrow.x2 = toNum(lineJson['@_x2']);
  arrow.y2 = toNum(lineJson['@_y2']);

  // Arrow head points from polygon "x1,y1 x2,y2 x3,y3"
  const points = toStr(polyJson['@_points'])
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number));
  if (points.length >= 3) {
    arrow.hx1 = points[1][0] ?? 0;
    arrow.hy1 = points[1][1] ?? 0;
    arrow.hx2 = points[2][0] ?? 0;
    arrow.hy2 = points[2][1] ?? 0;
  }

  // Stroke/fill from the line child
  readBaseShapeData(lineJson, arrow);

  return arrow;
});
