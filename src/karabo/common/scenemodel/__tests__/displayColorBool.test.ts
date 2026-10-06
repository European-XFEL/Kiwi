import { DisplayColorBoolModel, readScene } from '../api';

test('reads DisplayColorBool keys from a DisplayComponent scene tag', () => {
  const scene = readScene(`
    <svg:svg xmlns:svg="http://www.w3.org/2000/svg" xmlns:krb="http://karabo.eu/scene" krb:version="2">
      <svg:rect krb:class="DisplayComponent" krb:widget="DisplayColorBool"
        krb:keys="DEV.enabled" x="1" y="2" width="30" height="40" />
    </svg:svg>
  `);

  const model = scene.children[0] as DisplayColorBoolModel;
  expect(model).toBeInstanceOf(DisplayColorBoolModel);
  expect(model.klass).toBe('DisplayColorBool');
  expect(model.parent_component).toBe('DisplayComponent');
  expect(model.keys).toEqual(['DEV.enabled']);
});
