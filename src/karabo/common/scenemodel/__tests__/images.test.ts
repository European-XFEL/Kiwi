import {
  DetectorGraphModel,
  ImageGraphModel,
  readScene,
  WebCamGraphModel,
} from '../api';

test('ImageGraph reads desktop axes, transforms, aspect, legend and fixed levels', () => {
  const model = readScene(
    `<svg:svg xmlns:svg="http://www.w3.org/2000/svg" xmlns:krb="http://karabo.eu/scene" krb:version="2"><svg:rect krb:widget="ImageGraph" krb:x_label="Distance" krb:x_units="mm" krb:x_scale="2" krb:x_translate="-4" krb:y_scale="-3" krb:y_translate="8" krb:aspect_ratio="2" krb:show_scale="0" krb:color_levels="10,200"/></svg:svg>`
  ).children[0];
  expect(model).toMatchObject({
    x_label: 'Distance',
    x_units: 'mm',
    x_scale: 2,
    x_translate: -4,
    y_scale: -3,
    y_translate: 8,
    aspect_ratio: 2,
    show_scale: false,
    color_levels: [10, 200],
  });
  expect(new ImageGraphModel()).toMatchObject({
    x_label: 'X-axis',
    y_label: 'Y-axis',
    x_units: 'pixels',
    y_units: 'pixels',
    x_scale: 1,
    y_scale: 1,
    aspect_ratio: 1,
    show_scale: true,
    color_levels: [],
  });
});

test.each([
  ['WebCamGraph', WebCamGraphModel],
  ['ImageGraph', ImageGraphModel],
  ['DetectorGraph', DetectorGraphModel],
] as const)(
  '%s defaults and scene reader preserve keys, geometry and palette',
  (klass, Model) => {
    expect(new Model()).toMatchObject({
      klass,
      colormap: 'none',
    });
    const read = (attrs = '') =>
      readScene(
        `<svg:svg xmlns:svg="http://www.w3.org/2000/svg" xmlns:krb="http://karabo.eu/scene" krb:version="2"><svg:rect krb:class="DisplayComponent" krb:widget="${klass}" krb:keys="dev.image" x="3" y="4" width="50" height="70" ${attrs}/></svg:svg>`
      ).children[0];
    expect(read()).toBeInstanceOf(Model);
    expect(read()).toMatchObject({
      klass,
      keys: ['dev.image'],
      x: 3,
      y: 4,
      width: 50,
      height: 70,
      colormap: 'viridis',
    });
    expect(read('krb:colormap="plasma"')).toMatchObject({ colormap: 'plasma' });
  }
);
