/// <reference types="vite/client" />

import { ColorIcon } from './ColorIcon';

const svgModules = import.meta.glob<string>(
  ['@/assets/icons/statefulicons/**/*.svg', '@/assets/icons/*.svg'],
  { eager: true, query: '?raw', import: 'default' }
);

export const statefulIconModelsById: Record<string, ColorIcon> = {};

let bootstrapped = false;

export function bootstrapStatefulIcons(force = false): void {
  if (bootstrapped && !force) return;

  for (const iconId in statefulIconModelsById)
    delete statefulIconModelsById[iconId];

  for (const modulePath in svgModules) {
    const svgText = svgModules[modulePath];
    const svgRoot = svgText && parseSvgRoot(svgText);
    if (!svgRoot) {
      console.warn(
        '[statefulIcons] Could not parse:',
        fileNameFromPath(modulePath)
      );
      continue;
    }

    const iconId = getIconId(svgRoot);
    if (!iconId) {
      console.warn(
        '[statefulIcons] Missing icon_ id:',
        fileNameFromPath(modulePath)
      );
      continue;
    }

    const icon = ColorIcon.fromSvgText(svgText);
    if (!icon) {
      console.warn(
        '[statefulIcons] Could not compile:',
        fileNameFromPath(modulePath)
      );
      continue;
    }

    if (statefulIconModelsById[iconId]) {
      console.warn('[statefulIcons] Duplicate icon id:', iconId, modulePath);
    }

    const viewBox = getViewBox(svgRoot);
    statefulIconModelsById[iconId] = viewBox
      ? icon.withCachedViewBox(viewBox)
      : icon;
  }

  console.debug(
    '[statefulIcons] bootstrapped',
    Object.keys(statefulIconModelsById).length,
    'icons'
  );

  bootstrapped = true;
}

function parseSvgRoot(svgText: string): SVGSVGElement | null {
  if (typeof DOMParser === 'undefined' || !svgText.trim()) return null;

  const xml = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  if (xml.querySelector('parsererror')) return null;

  const root = xml.documentElement;
  return root instanceof SVGSVGElement ? root : null;
}

function getIconId(svgRoot: SVGSVGElement): string | null {
  return svgRoot.getAttribute('id')?.startsWith('icon_')
    ? svgRoot.getAttribute('id')
    : (svgRoot.querySelector('[id^="icon_"]')?.getAttribute('id') ?? null);
}

function getViewBox(svgRoot: SVGSVGElement): string | null {
  const viewBox = svgRoot.getAttribute('viewBox');
  return viewBox &&
    !svgRoot.querySelector('[transform]') &&
    !svgRoot.hasAttribute('transform')
    ? viewBox
    : measureViewBox(svgRoot);
}

function measureViewBox(svgRoot: SVGSVGElement): string | null {
  if (typeof document === 'undefined' || !document.body) return null;

  const svg = svgRoot.cloneNode(true) as SVGSVGElement;
  Object.assign(svg.style, {
    position: 'absolute',
    left: '-100000px',
    top: '-100000px',
    visibility: 'hidden',
  });

  document.body.appendChild(svg);
  try {
    const bounds = getBounds(svg);
    if (!bounds) return null;

    const pad =
      getMaxStrokeWidth(svg) + Math.max(bounds.width, bounds.height) * 0.06;
    return [
      bounds.x - pad,
      bounds.y - pad,
      Math.max(1e-6, bounds.width + pad * 2),
      Math.max(1e-6, bounds.height + pad * 2),
    ].join(' ');
  } finally {
    svg.remove();
  }
}

function getBounds(svg: SVGSVGElement): DOMRect | null {
  try {
    const bounds = svg.getBBox();
    if (
      Number.isFinite(bounds.x) &&
      Number.isFinite(bounds.y) &&
      bounds.width > 0 &&
      bounds.height > 0
    ) {
      return bounds;
    }
  } catch {}

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const element of svg.querySelectorAll<SVGGraphicsElement>(
    'path,rect,circle,ellipse,line,polyline,polygon,text,g,use'
  )) {
    try {
      const bounds = element.getBBox();
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    } catch {}
  }

  return minX === Infinity
    ? null
    : new DOMRect(
        minX,
        minY,
        Math.max(0, maxX - minX),
        Math.max(0, maxY - minY)
      );
}

function getMaxStrokeWidth(svg: SVGSVGElement): number {
  let maxStrokeWidth = 0;

  for (const element of svg.querySelectorAll<SVGGraphicsElement>('*')) {
    let strokeWidth =
      parseFloat(element.getAttribute('stroke-width') || '') || 0;

    const styleMatch = element
      .getAttribute('style')
      ?.match(/stroke-width\s*:\s*([0-9.]+)/i);
    const styledStrokeWidth = parseFloat(styleMatch?.[1] || '') || 0;
    if (styledStrokeWidth > strokeWidth) strokeWidth = styledStrokeWidth;
    if (strokeWidth <= 0) continue;

    try {
      const matrix = element.getCTM();
      if (matrix) {
        const scale = Math.max(
          Math.hypot(matrix.a, matrix.b),
          Math.hypot(matrix.c, matrix.d)
        );
        if (scale > 0) strokeWidth *= scale;
      }
    } catch {}

    if (strokeWidth > maxStrokeWidth) maxStrokeWidth = strokeWidth;
  }

  return (maxStrokeWidth || 1) + 0.75;
}

function fileNameFromPath(filePath: string): string {
  return filePath.slice(filePath.lastIndexOf('/') + 1);
}
