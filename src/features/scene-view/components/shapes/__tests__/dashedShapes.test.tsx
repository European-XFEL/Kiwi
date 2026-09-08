/**
 * Dashed shapes — dash length has to match the Karabo GUI.
 *
 * stroke-style is Qt's PenStyle enum and the GUI re-applies it when a scene
 * loads, which overrides any stored stroke-dasharray. We used to emit the
 * stored value verbatim, so a rect whose dasharray disagreed with its
 * stroke-style drew far longer dashes than Qt did.
 */

import { render } from '@testing-library/react';
import { readScene, RectangleModel } from '@/karabo/common/api';
import { dashArray } from '../shapeUtils';
import SceneView from '../../SceneView';

jest.mock('@/features/controllers/api', () => ({
  bootstrapControllerRenderers: jest.fn(),
  bootstrapStatefulIcons: jest.fn(),
  statefulIconModelsById: {},
  getModelKeys: jest.fn(() => []),
  getQFontTextStyle: jest.fn(() => ({})),
}));

const rect = (attrs: string) =>
  `<svg:rect stroke="#000000" stroke-opacity="1.0" stroke-linecap="butt"
     stroke-dashoffset="0.0" stroke-linejoin="miter" stroke-miterlimit="4.0"
     ${attrs} />`;

const scene = (body: string) => `
  <svg:svg xmlns:krb="http://karabo.eu/scene" xmlns:svg="http://www.w3.org/2000/svg"
           krb:version="2" krb:uuid="dashes" height="310" width="940">
    ${body}
  </svg:svg>
`;

// Both rects are taken verbatim from the FXE-SIGNAL-EXCHANGE scene.
const TUNNEL_WALL = rect(
  `stroke-width="3.0" stroke-dasharray="20.0 20.0" stroke-style="2"
   fill="#a2a2a2" fill-opacity="1.0" x="540" y="100" width="18" height="100"`
);

const DASHED_LINK = rect(
  `stroke-width="1.0" stroke-dasharray="4.0 2.0" stroke-style="2"
   fill="none" x="235" y="146" width="150" height="8"`
);

const model = (xml: string) =>
  readScene(scene(xml)).children.find(
    (child) => child instanceof RectangleModel
  ) as RectangleModel;

describe('dashArray', () => {
  it('scales the Qt pen pattern by the pen width, ignoring a stale dasharray', () => {
    // The file says "20 20", but stroke-style 2 is Qt DashLine, whose pattern
    // is [4, 2] in pen-width units — 12/6 at width 3, as the Qt GUI draws it.
    expect(dashArray(model(TUNNEL_WALL))).toBe('12 6');
  });

  it('agrees with the stored dasharray when the file is self-consistent', () => {
    // DashLine at width 1 is exactly what Karabo wrote, so nothing changes.
    expect(dashArray(model(DASHED_LINK))).toBe('4 2');
  });

  it.each([
    ['DashLine', 2, '4 2'],
    ['DotLine', 3, '1 2'],
    ['DashDotLine', 4, '4 2 1 2'],
    ['DashDotDotLine', 5, '4 2 1 2 1 2'],
  ])('maps Qt %s to its predefined pattern', (_name, style, expected) => {
    const shape = model(
      rect(
        `stroke-width="1.0" stroke-dasharray="" stroke-style="${style}"
         fill="none" x="0" y="0" width="50" height="10"`
      )
    );
    expect(dashArray(shape)).toBe(expected);
  });

  it('leaves a solid pen undashed even if a dasharray lingers in the file', () => {
    const shape = model(
      rect(
        `stroke-width="1.0" stroke-dasharray="20.0 20.0" stroke-style="1"
         fill="none" x="0" y="0" width="50" height="10"`
      )
    );
    expect(dashArray(shape)).toBeUndefined();
  });

  it('treats a missing stroke-style as solid, since the reader defaults to it', () => {
    // Karabo always writes stroke-style beside stroke-dasharray, so this only
    // reaches SVG that never went through the GUI. The reader cannot tell an
    // absent stroke-style from an explicit solid one, and the pen style wins.
    const shape = model(
      `<svg:rect stroke="#000000" stroke-width="1.0" stroke-dasharray="7.0 3.0"
         fill="none" x="0" y="0" width="50" height="10" />`
    );
    expect(shape.stroke_style).toBe(1);
    expect(dashArray(shape)).toBeUndefined();
  });
});

describe('dashed rectangle rendering', () => {
  it('renders the tunnel-wall with Qt dash lengths and keeps its background', () => {
    const { container } = render(
      <SceneView
        sceneModel={readScene(scene(TUNNEL_WALL))}
        scale={1}
        fitMode="fit-page"
      />
    );

    const rendered = container.querySelector('rect');
    expect(rendered?.getAttribute('stroke-dasharray')).toBe('12 6');
    expect(rendered?.getAttribute('fill')).toBe('#a2a2a2');
  });
});
