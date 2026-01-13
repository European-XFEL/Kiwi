/// <reference types="vite/client" />

/**
 * Uses Vite's import.meta.glob to dynamically import SVG icons from @/assets/icons/*.svg
 * The reference types="vite/client" provides TypeScript support for import.meta.glob.
 */

const modules = import.meta.glob<string>('@/assets/icons/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
});

const statefulIconTextById: Record<string, string> = {};

for (const path in modules) {
  const svgText = modules[path];
  if (!svgText) continue;

  // look for <svg ... id="icon_..."> or <g ... id="icon_...">
  const match = svgText.match(/<(svg|g)[^>]*\sid="(icon_[^"]+)"[^>]*>/i);

  if (match?.[2]) {
    // match[2] is the actual id value, e.g. "icon_pneu_valve"
    statefulIconTextById[match[2]] = svgText;
  } else {
    // if this ever happens, it means someone added an SVG without an id
    // we could log it to help debugging
    console.warn(
      '[statefulIcons] SVG has no icon_ id:',
      path.slice(path.lastIndexOf('/') + 1)
    );
  }
}

export { statefulIconTextById };
