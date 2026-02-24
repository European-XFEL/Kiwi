/// <reference types="vite/client" />

/**
 * Dynamically import stateful SVG icons.
 *
 * SVGs are keyed by the `id` of the first element matching `[id^="icon_"]`,
 * extracted via DOMParser. The root <svg> id is a generic Inkscape artifact
 * and is intentionally ignored.
 *
 * The previous flat `@/assets/icons/*.svg` glob is kept as a fallback while the
 * asset tree settles.
 */
const modules = import.meta.glob<string>(
  ['@/assets/icons/statefulicons/**/*.svg', '@/assets/icons/*.svg'],
  {
    eager: true,
    query: '?raw',
    import: 'default',
  }
);

const statefulIconTextById: Record<string, string> = {};

for (const path in modules) {
  const svgText = modules[path];
  if (!svgText) continue;

  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');

  if (doc.querySelector('parsererror')) {
    console.warn(
      '[statefulIcons] Invalid SVG:',
      path.slice(path.lastIndexOf('/') + 1)
    );
    continue;
  }

  const id =
    doc.querySelector('svg[id^="icon_"], g[id^="icon_"]')?.getAttribute('id') ??
    null;

  if (!id) {
    console.warn(
      '[statefulIcons] SVG has no icon_ id:',
      path.slice(path.lastIndexOf('/') + 1)
    );
    continue;
  }

  if (statefulIconTextById[id]) {
    console.warn('[statefulIcons] Duplicate icon id:', id, path);
  }

  statefulIconTextById[id] = svgText;
}

export { statefulIconTextById };
