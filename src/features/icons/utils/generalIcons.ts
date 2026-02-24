/// <reference types="vite/client" />

/**
 * Dynamically import general SVG icons, keyed by filename (without extension).
 *
 * General icons are static — they are not recolored at runtime.
 * Root SVG ids are intentionally ignored here: most are generic Inkscape/Illustrator
 * defaults (Layer_1, Capa_1, etc.) and would collide across files.
 */
const modules = import.meta.glob<string>('@/assets/icons/general/**/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
});

const generalIconTextByName: Record<string, string> = {};

for (const path in modules) {
  const svgText = modules[path];
  if (!svgText) continue;

  const name = path.slice(path.lastIndexOf('/') + 1).replace(/\.svg$/i, '');

  if (generalIconTextByName[name]) {
    console.warn('[generalIcons] Duplicate filename:', name, path);
  }

  generalIconTextByName[name] = svgText;
}

export { generalIconTextByName };
