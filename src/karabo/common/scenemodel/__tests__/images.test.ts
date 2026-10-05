import { ImageGraphModel, readScene, WebCamGraphModel } from '../api';

test.each([
  ['WebCamGraph', WebCamGraphModel],
  ['ImageGraph', ImageGraphModel],
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
