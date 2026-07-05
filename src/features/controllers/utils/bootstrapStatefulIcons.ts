/// <reference types="vite/client" />

import { ColorIcon, asArray } from './ColorIcon';

const svgModules = import.meta.glob<string>(
  ['@/assets/icons/statefulicons/**/*.svg', '@/assets/icons/*.svg'],
  {
    eager: true,
    query: '?raw',
    import: 'default',
  }
);

export const statefulIconModelsById: Record<string, ColorIcon> = {};

let bootstrapped = false;

export function bootstrapStatefulIcons(force = false): void {
  if (bootstrapped && !force) return;

  for (const key of Object.keys(statefulIconModelsById)) {
    delete statefulIconModelsById[key];
  }

  for (const modulePath in svgModules) {
    const svgText = svgModules[modulePath];
    if (!svgText) continue;

    const iconModel = ColorIcon.fromSvgText(svgText);
    if (!iconModel) {
      console.warn(
        '[statefulIcons] Could not parse:',
        fileNameFromPath(modulePath)
      );
      continue;
    }

    const iconId = extractIconId(iconModel.parsed);
    if (!iconId) {
      console.warn(
        '[statefulIcons] Missing icon_ id:',
        fileNameFromPath(modulePath)
      );
      continue;
    }

    if (statefulIconModelsById[iconId]) {
      console.warn('[statefulIcons] Duplicate icon id:', iconId, modulePath);
    }

    const computedViewBox = computeViewBox(iconModel.parsed);
    statefulIconModelsById[iconId] = computedViewBox
      ? iconModel.withCachedViewBox(computedViewBox)
      : iconModel;
  }

  console.debug(
    '[statefulIcons] bootstrapped',
    Object.keys(statefulIconModelsById).length,
    'icons'
  );

  bootstrapped = true;
}

// ViewBox computation
// ----------------------------------------------------------------------------

/**
 * Returns the best viewBox string for the icon.
 * Uses the authored viewBox when there are no transforms; otherwise measures via DOM.
 */
function computeViewBox(parsedSvg: Record<string, unknown>): string | null {
  const svgNode = parsedSvg['svg'] as Record<string, unknown> | undefined;
  if (!svgNode) return null;

  if (svgNode['@_viewBox'] && !hasTransformInTree(svgNode)) {
    return svgNode['@_viewBox'] as string;
  }

  return measureViewBoxFromGeometry(svgNode);
}

/**
 * Mounts the SVG node in a hidden offscreen position so browser geometry APIs can measure it.
 * Returns a padded viewBox string, or null when measurement is unavailable.
 */
function measureViewBoxFromGeometry(
  svgNode: Record<string, unknown>
): string | null {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof DOMParser === 'undefined'
  ) {
    return null;
  }

  const svgDocument = parseSvgNodeToDom(svgNode);
  if (!svgDocument) return null;

  const svgElement = svgDocument.documentElement;
  if (!(svgElement instanceof SVGSVGElement)) return null;

  // Hide the element off-screen so getBBox() works without affecting layout.
  // Do NOT set width/height to 0 — Firefox won't compute geometry for zero-size SVGs.
  svgElement.style.position = 'absolute';
  svgElement.style.left = '-100000px';
  svgElement.style.top = '-100000px';
  svgElement.style.visibility = 'hidden';

  document.body.appendChild(svgElement);

  try {
    return buildPaddedViewBox(svgElement);
  } finally {
    svgElement.remove();
  }
}

function parseSvgNodeToDom(svgNode: Record<string, unknown>): Document | null {
  const svgString = ColorIcon.serialize({ svg: svgNode });
  if (!svgString) return null;

  const svgDocument = new DOMParser().parseFromString(
    svgString,
    'image/svg+xml'
  );
  if (svgDocument.querySelector('parsererror')) return null;
  return svgDocument;
}

/** Expands the measured geometry by stroke-aware and percentage-based padding. */
function buildPaddedViewBox(svgElement: SVGSVGElement): string | null {
  const boundingBox = getBoundingBoxSafely(svgElement);
  if (!boundingBox) return null;

  const maxStroke = getMaxStrokeWidth(svgElement);
  const percentPad = Math.max(boundingBox.width, boundingBox.height) * 0.06;
  const padding = maxStroke + percentPad;

  const x = boundingBox.x - padding;
  const y = boundingBox.y - padding;
  const width = Math.max(1e-6, boundingBox.width + 2 * padding);
  const height = Math.max(1e-6, boundingBox.height + 2 * padding);

  return `${x} ${y} ${width} ${height}`;
}

/**
 * Returns a robust geometry box for the SVG root.
 * Falls back to unioning child element bounds when root `getBBox()` is unavailable.
 */
function getBoundingBoxSafely(svgElement: SVGSVGElement): DOMRect | null {
  try {
    const rootBounds = svgElement.getBBox();
    // Firefox returns {x:0,y:0,width:0,height:0} for zero-size SVGs — treat as failure.
    if (
      Number.isFinite(rootBounds.x) &&
      Number.isFinite(rootBounds.y) &&
      rootBounds.width > 0 &&
      rootBounds.height > 0
    )
      return rootBounds;
  } catch {
    // getBBox() can throw on elements with no geometry — fall through to manual union
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const shapeElements = svgElement.querySelectorAll<SVGGraphicsElement>(
    'path,rect,circle,ellipse,line,polyline,polygon,text,g,use'
  );
  shapeElements.forEach((shapeElement) => {
    try {
      const elementBounds = shapeElement.getBBox();
      minX = Math.min(minX, elementBounds.x);
      minY = Math.min(minY, elementBounds.y);
      maxX = Math.max(maxX, elementBounds.x + elementBounds.width);
      maxY = Math.max(maxY, elementBounds.y + elementBounds.height);
    } catch {
      // skip elements that getBBox() can't measure
    }
  });

  if (minX === Infinity) return null;
  return new DOMRect(
    minX,
    minY,
    Math.max(0, maxX - minX),
    Math.max(0, maxY - minY)
  );
}

/**
 * Computes the maximum stroke width in SVG viewport units.
 * Reads local `stroke-width` values and scales them with each element CTM.
 */
function getMaxStrokeWidth(svgElement: SVGSVGElement): number {
  let maxStrokeWidth = 0;
  const graphicElements = svgElement.querySelectorAll<SVGGraphicsElement>('*');

  graphicElements.forEach((graphicElement) => {
    // Read the authored stroke-width (may be in local coordinate space).
    let localStrokeWidth: number | null = null;

    const strokeWidthAttr = graphicElement.getAttribute('stroke-width');
    if (strokeWidthAttr) {
      const parsedStrokeWidth = Number.parseFloat(strokeWidthAttr);
      if (Number.isFinite(parsedStrokeWidth))
        localStrokeWidth = parsedStrokeWidth;
    }

    const style = graphicElement.getAttribute('style');
    if (style) {
      const strokeWidthMatch = style.match(/stroke-width\s*:\s*([0-9.]+)/i);
      if (strokeWidthMatch) {
        const parsedStrokeWidth = Number.parseFloat(strokeWidthMatch[1]);
        if (
          Number.isFinite(parsedStrokeWidth) &&
          (localStrokeWidth === null || parsedStrokeWidth > localStrokeWidth)
        ) {
          localStrokeWidth = parsedStrokeWidth;
        }
      }
    }

    if (localStrokeWidth === null || localStrokeWidth <= 0) return;

    // Scale by the element's CTM so we work in SVG viewport units.
    // Without this, strokes inside scaled groups (e.g. matrix(0,1.25,...)) are underestimated.
    let viewportStrokeWidth = localStrokeWidth;
    try {
      const currentTransformMatrix = graphicElement.getCTM();
      if (currentTransformMatrix) {
        // Use the largest local-axis scale so non-uniform transforms do not under-pad.
        const localToViewportScale = Math.max(
          Math.hypot(currentTransformMatrix.a, currentTransformMatrix.b),
          Math.hypot(currentTransformMatrix.c, currentTransformMatrix.d)
        );
        if (localToViewportScale > 0) {
          viewportStrokeWidth = localStrokeWidth * localToViewportScale;
        }
      }
    } catch {
      // getCTM() can throw for detached or invisible elements — use raw value
    }

    if (viewportStrokeWidth > maxStrokeWidth) {
      maxStrokeWidth = viewportStrokeWidth;
    }
  });

  return (maxStrokeWidth > 0 ? maxStrokeWidth : 1) + 0.75;
}

/** Returns true when this parsed SVG subtree has any explicit `transform` attribute. */
function hasTransformInTree(treeNode: Record<string, unknown>): boolean {
  if (
    typeof treeNode['@_transform'] === 'string' &&
    treeNode['@_transform'].trim()
  ) {
    return true;
  }

  for (const [key, childValue] of Object.entries(treeNode)) {
    if (key.startsWith('@_') || key === '#text') continue;
    for (const childNode of asArray(childValue as unknown[] | undefined)) {
      if (childNode && typeof childNode === 'object') {
        if (hasTransformInTree(childNode as Record<string, unknown>))
          return true;
      }
    }
  }

  return false;
}

// Icon ID extraction
// ----------------------------------------------------------------------------

/** Finds the first `icon_*` id in the parsed SVG payload. */
function extractIconId(parsedSvg: Record<string, unknown>): string | null {
  const svgRootNode = parsedSvg.svg as Record<string, unknown> | undefined;
  if (!svgRootNode) return null;
  return findFirstIconId(svgRootNode);
}

/** Depth-first search for the first node whose `id` starts with `icon_`. */
function findFirstIconId(treeNode: Record<string, unknown>): string | null {
  const nodeId = treeNode['@_id'];
  if (typeof nodeId === 'string' && nodeId.startsWith('icon_')) return nodeId;

  for (const [key, childValue] of Object.entries(treeNode)) {
    if (key.startsWith('@_') || key === '#text') continue;
    for (const childNode of asArray(childValue as unknown[] | undefined)) {
      if (!childNode || typeof childNode !== 'object') continue;
      const found = findFirstIconId(childNode as Record<string, unknown>);
      if (found) return found;
    }
  }

  return null;
}

/** Returns the final path segment for friendlier log messages. */
function fileNameFromPath(filePath: string): string {
  return filePath.slice(filePath.lastIndexOf('/') + 1);
}
