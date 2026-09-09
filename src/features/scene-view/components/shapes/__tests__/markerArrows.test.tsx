/**
 * Marker arrows — the regression this suite exists for.
 *
 * Karabo writes an arrow one of two ways: an ArrowPolygonModel group carrying
 * its own head polygon, or a plain shape referencing a <marker> defined in
 * <svg:defs>. The marker form used to lose its head entirely — <svg:defs> hit
 * the wildcard reader and rendered as a silent null, and marker-end never
 * reached the SVG — so scenes rendered bare shafts with no warning.
 *
 * Reading is covered in scenemodel/__tests__/readScene.test.ts; this suite is
 * about what ends up in the DOM.
 */

import { render } from '@testing-library/react';
import { readScene } from '@/karabo/common/api';
import SceneView from '../../SceneView';

jest.mock('@/features/controllers/api', () => ({
  bootstrapControllerRenderers: jest.fn(),
  bootstrapStatefulIcons: jest.fn(),
  statefulIconModelsById: {},
  getModelKeys: jest.fn(() => []),
  getQFontTextStyle: jest.fn(() => ({})),
}));

const MARKER_ID = 'marker288071';

const scene = (body: string, uuid = 'marker-arrows') => `
  <svg:svg xmlns:krb="http://karabo.eu/scene" xmlns:svg="http://www.w3.org/2000/svg" krb:version="2" krb:uuid="${uuid}" height="666" width="859">
    <svg:defs>
      <svg:marker id="${MARKER_ID}" markerHeight="10.0" markerUnits="strokeWidth" markerWidth="10.0" orient="auto" refX="0.0" refY="3.0">
        <svg:path stroke="none" fill="#000000" fill-opacity="1.0" d="M0,0 L0,6 L9,3 z" />
      </svg:marker>
    </svg:defs>
    ${body}
  </svg:svg>
`;

// Shaft geometry taken from the scene that first showed the bug.
const LINE = `<svg:line stroke="#000000" stroke-opacity="1.0" stroke-width="1.0" fill="none"
  marker-end="url(#${MARKER_ID})" x1="374" y1="130" x2="428" y2="130" />`;

const renderScene = (xml: string) =>
  render(
    <SceneView sceneModel={readScene(xml)} scale={1} fitMode="fit-page" />
  );

const markerId = (container: HTMLElement) =>
  container.querySelector('defs > marker')?.getAttribute('id');

describe('marker arrows', () => {
  it('renders the marker definition and points the shaft at it', () => {
    const { container } = renderScene(scene(LINE));

    const marker = container.querySelector('defs > marker');
    expect(marker).not.toBeNull();
    expect(marker?.getAttribute('orient')).toBe('auto');
    expect(marker?.querySelector('path')?.getAttribute('d')).toBe(
      'M0,0 L0,6 L9,3 z'
    );

    // The shaft must resolve to the marker that was actually rendered.
    const line = container.querySelector('svg line');
    expect(line?.getAttribute('marker-end')).toBe(
      `url(#${markerId(container)})`
    );
  });

  it('forwards markers on paths too, not just lines', () => {
    const { container } = renderScene(
      scene(
        `<svg:path stroke="#000000" stroke-width="1.0" fill="none"
           marker-end="url(#${MARKER_ID})" d="M374,130 L428,130" />`
      )
    );

    const path = container.querySelector('svg path[d="M374,130 L428,130"]');
    expect(path?.getAttribute('marker-end')).toBe(
      `url(#${markerId(container)})`
    );
  });

  it('scopes definition ids so two scenes cannot cross-resolve', () => {
    const { container } = render(
      <>
        <SceneView
          sceneModel={readScene(scene(LINE, 'scene-a'))}
          scale={1}
          fitMode="fit-page"
        />
        <SceneView
          sceneModel={readScene(scene(LINE, 'scene-b'))}
          scale={1}
          fitMode="fit-page"
        />
      </>
    );

    const ids = Array.from(container.querySelectorAll('defs > marker')).map(
      (marker) => marker.getAttribute('id')
    );
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
    expect(ids.every((id) => id?.endsWith(MARKER_ID))).toBe(true);

    // Each shaft resolves to the marker rendered alongside it.
    const references = Array.from(container.querySelectorAll('svg line')).map(
      (line) => line.getAttribute('marker-end')
    );
    expect(references).toEqual(ids.map((id) => `url(#${id})`));
  });

  it('scopes funcIRIs written as inline styles, not just attributes', () => {
    const { container } = renderScene(
      scene(LINE, 'styled-defs').replace(
        '<svg:path stroke="none" fill="#000000" fill-opacity="1.0"',
        '<svg:path style="fill:url(#grad);stroke:none"'
      )
    );

    const scopedMarker = markerId(container) ?? '';
    const scope = scopedMarker.slice(0, -MARKER_ID.length);
    expect(
      container.querySelector('defs marker path')?.getAttribute('style')
    ).toContain(`url(#${scope}grad)`);
  });

  it('drops script tags found inside defs, and says so', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation();
    const { container } = renderScene(
      scene(LINE).replace(
        '<svg:defs>',
        '<svg:defs><svg:script>window.pwned = 1</svg:script>'
      )
    );

    expect(container.querySelector('script')).toBeNull();
    // A skipped definition must not vanish quietly — that is the bug this
    // whole change exists to stop repeating.
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('<script>'));
    warn.mockRestore();
  });
});

describe('arrow polygon groups', () => {
  // The other arrow form: a group carrying its own head, no <defs> involved.
  const group = `
    <svg:g krb:class="ArrowPolygonModel">
      <svg:line stroke="#000000" stroke-opacity="1.0" stroke-width="1.0" fill="none"
        x1="374" y1="130" x2="428" y2="130" />
      <svg:polygon points="428,130 418,133 418,127 " stroke="#000000"
        stroke-width="1.0" fill="#000000" fill-opacity="1.0" />
    </svg:g>`;

  it('renders the shaft and the head in one svg', () => {
    const { container } = renderScene(scene(group));
    const svg = Array.from(container.querySelectorAll('svg')).find((element) =>
      element.querySelector('line')
    );

    // The head is part of the arrow's own svg, and the viewBox has to be tall
    // enough to hold it — a line-only box would be 56x2 here.
    expect(svg?.getAttribute('viewBox')).toBe('373 126 56 12');
    expect(svg?.querySelector('polygon')?.getAttribute('points')).toBe(
      '428,130 418,133 418,127'
    );
  });
});
