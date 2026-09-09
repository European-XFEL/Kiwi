/**
 * Defs — SVG <defs> block holding marker/gradient definitions.
 *
 * Karabo draws arrowheads as <marker> definitions referenced from a shape's
 * marker-end. Definitions paint nothing themselves, so this renders a zero-size
 * SVG whose only job is to put them in the document, where funcIRI references
 * such as url(#marker288071) resolve.
 *
 * That lookup is document-wide, so every id is prefixed with the scene's defs
 * scope and every shape resolves its references through the same scope. Without
 * it, two scenes open at once would resolve each other's definitions.
 */

import React from 'react';
import { DefsModel, type SvgNode } from '@/karabo/common/api';
import { registerRenderer } from '../../renderRegistry';
import { scopedFuncIri, scopedId, useDefsScope } from './shapeUtils';
import { warnOnce } from '../../utils/warnOnce';

// Sanitising
// ----------------------------------------------------------------------------
// Scene XML is server-supplied, so only shape-defining SVG tags are re-emitted.
// Event handlers and editor-private namespaces (inkscape:, sodipodi:) are dropped.

const ALLOWED_TAGS = new Set([
  'marker',
  'path',
  'polygon',
  'polyline',
  'line',
  'circle',
  'ellipse',
  'rect',
  'g',
  'linearGradient',
  'radialGradient',
  'stop',
]);

const ATTRIBUTE_NAME = /^[a-zA-Z][\w-]*$/;

const isSafeAttribute = (name: string): boolean =>
  (ATTRIBUTE_NAME.test(name) && !/^on/i.test(name)) || name === 'xlink:href';

// React wants SVG presentation attributes camelCased ("fill-opacity" is rejected
// as an invalid DOM property), while data-/aria- must stay hyphenated.
const toReactAttributeName = (name: string): string => {
  if (name === 'class') return 'className';
  if (name === 'xlink:href') return 'xlinkHref';
  if (name.startsWith('data-') || name.startsWith('aria-')) return name;
  return name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
};

// A style="fill:#000000;stroke:none" string would throw in React, which expects
// an object, so Inkscape-authored definitions are converted rather than dropped.
const toStyleObject = (value: string, scope: string): React.CSSProperties =>
  Object.fromEntries(
    value
      .split(';')
      .map((declaration) => {
        const separator = declaration.indexOf(':');
        return [
          declaration.slice(0, separator),
          declaration.slice(separator + 1),
        ];
      })
      .filter(([property, propertyValue]) => property && propertyValue)
      .map(([property, propertyValue]) => [
        property
          .trim()
          .replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()),
        scopedFuncIri(propertyValue.trim(), scope),
      ])
  );

function toReactAttributeValue(
  name: string,
  value: string,
  scope: string
): string | React.CSSProperties {
  if (name === 'style') return toStyleObject(value, scope);
  if (name === 'id') return scopedId(value, scope);
  return scopedFuncIri(value, scope);
}

function safeAttributes(attributes: Record<string, string>, scope: string) {
  return Object.fromEntries(
    Object.entries(attributes)
      .filter(([name]) => isSafeAttribute(name))
      .map(([name, value]) => [
        toReactAttributeName(name),
        toReactAttributeValue(name, value, scope),
      ])
  );
}

// Defs
// ----------------------------------------------------------------------------

function renderSvgNode(
  node: SvgNode,
  key: number,
  scope: string
): React.ReactNode {
  if (!ALLOWED_TAGS.has(node.tag)) {
    warnOnce(
      `defs:${node.tag}`,
      `[Scene] Skipped <${node.tag}> inside <defs> — not a supported definition`
    );
    return null;
  }

  return React.createElement(
    node.tag,
    { key, ...safeAttributes(node.attributes, scope) },
    node.children.length
      ? node.children.map((child, index) => renderSvgNode(child, index, scope))
      : undefined
  );
}

const Defs: React.FC<{ model: DefsModel }> = React.memo(({ model }) => {
  const scope = useDefsScope();

  return (
    <svg
      width={0}
      height={0}
      aria-hidden
      style={{ position: 'absolute', overflow: 'hidden' }}
    >
      <defs>
        {model.nodes.map((node, index) => renderSvgNode(node, index, scope))}
      </defs>
    </svg>
  );
});

registerRenderer('Defs', Defs);

export default Defs;
