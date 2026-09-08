/**
 * Rectangles stored with negative extents.
 *
 * Dragging a rectangle right-to-left or bottom-to-top in the Karabo GUI stores
 * a negative width or height. Qt normalises that when painting, but SVG treats
 * it as an error and skips the element — and a negative CSS width is dropped
 * outright, collapsing the positioned shell to nothing. The shape disappeared
 * with no warning; only the normalised box makes it visible again.
 */

import { render } from '@testing-library/react';
import { readScene, RectangleModel } from '@/karabo/common/api';
import { resolveBounds } from '../../../bounds';
import SceneView from '../../SceneView';

jest.mock('@/features/controllers/api', () => ({
  bootstrapControllerRenderers: jest.fn(),
  bootstrapStatefulIcons: jest.fn(),
  statefulIconModelsById: {},
  getModelKeys: jest.fn(() => []),
  getQFontTextStyle: jest.fn(() => ({})),
}));

const scene = (rect: string) => `
  <svg:svg xmlns:krb="http://karabo.eu/scene" xmlns:svg="http://www.w3.org/2000/svg"
           krb:version="2" krb:uuid="negative-rect" height="775" width="1278">
    ${rect}
  </svg:svg>
`;

// The PP Laser panel background, taken verbatim from the HED PPU scene.
const PANEL = `<svg:rect stroke="#000000" stroke-opacity="1.0" stroke-linecap="butt"
  stroke-dashoffset="0.0" stroke-width="1.0" stroke-dasharray="" stroke-style="1"
  stroke-linejoin="miter" stroke-miterlimit="4.0" fill="#aaff00" fill-opacity="1.0"
  x="590" y="390" width="-222" height="-335" />`;

const model = (xml: string) =>
  readScene(scene(xml)).children[0] as RectangleModel;

describe('negative rectangle extents', () => {
  it('keeps the raw values on the model for round-tripping', () => {
    const rect = model(PANEL);

    expect(rect.x).toBe(590);
    expect(rect.y).toBe(390);
    expect(rect.width).toBe(-222);
    expect(rect.height).toBe(-335);
  });

  it('normalises the bounding box the way Qt paints it', () => {
    expect(resolveBounds(model(PANEL))).toEqual({
      x: 368,
      y: 55,
      width: 222,
      height: 335,
    });
  });

  it('leaves an ordinary rectangle alone', () => {
    const rect = model(
      `<svg:rect fill="#aaffff" x="380" y="200" width="202" height="101" />`
    );

    expect(resolveBounds(rect)).toEqual({
      x: 380,
      y: 200,
      width: 202,
      height: 101,
    });
  });

  it.each([
    ['negative width', 'x="590" y="55" width="-222" height="335"', 368, 55],
    ['negative height', 'x="368" y="390" width="222" height="-335"', 368, 55],
  ])('normalises %s', (_name, geometry, x, y) => {
    expect(
      resolveBounds(model(`<svg:rect fill="#aaff00" ${geometry} />`))
    ).toEqual({ x, y, width: 222, height: 335 });
  });

  it('normalises inside a FixedLayout, where the scene actually puts it', () => {
    // The PP Laser panel is the first child of a FixedLayout, and the
    // normalised rect is deliberately larger than the layout box.
    const { container } = render(
      <SceneView
        sceneModel={readScene(
          scene(
            `<svg:g krb:class="FixedLayout" krb:x="380" krb:y="80"
                    krb:height="299" krb:width="202">${PANEL}</svg:g>`
          )
        )}
        scale={1}
        fitMode="fit-page"
      />
    );

    const child = container.querySelector(
      '[id^="FixedLayout-child"]'
    ) as HTMLElement;
    expect(child.style.left).toBe('-12px'); // 368 - 380
    expect(child.style.top).toBe('-25px'); // 55 - 80
    expect(child.style.width).toBe('222px');
    expect(child.style.height).toBe('335px');
  });

  it('gives the shell a real size so the rectangle actually paints', () => {
    const { container } = render(
      <SceneView
        sceneModel={readScene(scene(PANEL))}
        scale={1}
        fitMode="fit-page"
      />
    );

    // Before normalising, the negative values were dropped and the shell had no
    // width or height at all, so nothing was visible.
    const shell = container.querySelector('[id^="SceneObject"]') as HTMLElement;
    expect(shell.style.left).toBe('368px');
    expect(shell.style.top).toBe('55px');
    expect(shell.style.width).toBe('222px');
    expect(shell.style.height).toBe('335px');

    expect(container.querySelector('rect')?.getAttribute('fill')).toBe(
      '#aaff00'
    );
  });
});
