import { ColorIcon } from '../ColorIcon';

describe('ColorIcon XML helpers', () => {
  it('round-trips SVG namespaces, repeated children, and text nodes', () => {
    const svgText = `
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <title>Stateful icon</title>
        <g id="icon_test">
          <desc>Used in tests</desc>
          <text>
            <tspan x="1" y="2">Hi</tspan>
          </text>
          <use xlink:href="#shape" />
          <path id="shape" d="M0 0h1v1H0z" />
          <path d="M1 1h1v1H1z" />
        </g>
      </svg>
    `;

    const icon = ColorIcon.fromSvgText(svgText);

    expect(icon).not.toBeNull();

    const parsedSvg = icon!.parsed.svg as Record<string, unknown>;
    expect((parsedSvg.title as Record<string, unknown>)['#text']).toBe(
      'Stateful icon'
    );

    const group = parsedSvg.g as Record<string, unknown>;
    expect((group.use as Record<string, unknown>)['@_xlink:href']).toBe(
      '#shape'
    );
    expect(Array.isArray(group.path)).toBe(true);

    const serialized = icon!.toSvg();
    const roundTripDocument = new DOMParser().parseFromString(
      serialized,
      'image/svg+xml'
    );

    expect(roundTripDocument.querySelector('parsererror')).toBeNull();
    expect(
      roundTripDocument.getElementsByTagName('title')[0]?.textContent
    ).toBe('Stateful icon');
    expect(roundTripDocument.getElementsByTagName('desc')[0]?.textContent).toBe(
      'Used in tests'
    );
    expect(
      roundTripDocument.getElementsByTagName('tspan')[0]?.textContent
    ).toBe('Hi');
    expect(roundTripDocument.getElementsByTagName('path')).toHaveLength(2);
    expect(
      roundTripDocument
        .getElementsByTagName('use')[0]
        ?.getAttribute('xlink:href')
    ).toBe('#shape');
  });

  it('fills in viewBox from authored dimensions when missing', () => {
    const icon = ColorIcon.fromSvgText(
      '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8"><g id="icon_test" /></svg>'
    );

    expect(icon).not.toBeNull();

    const documentWithViewBox = new DOMParser().parseFromString(
      icon!.toSvgWithViewBox(),
      'image/svg+xml'
    );
    const svgElement = documentWithViewBox.documentElement;

    expect(svgElement.getAttribute('viewBox')).toBe('0 0 12 8');
    expect(svgElement.getAttribute('width')).toBe('100%');
    expect(svgElement.getAttribute('height')).toBe('100%');
  });
});
