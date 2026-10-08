import {
  DisplayColorBoolModel,
  DisplayErrorBoolModel,
  readScene,
} from '../api';

test.each([
  ['DisplayColorBool', DisplayColorBoolModel],
  ['DisplayErrorBool', DisplayErrorBoolModel],
] as const)('reads %s geometry, keys and inversion', (name, Model) => {
  for (const [attribute, invert] of [
    ['', false],
    ['krb:invert="true"', true],
    ['krb:invert="false"', false],
  ] as const) {
    const scene = readScene(`
      <svg:svg xmlns:svg="http://www.w3.org/2000/svg" xmlns:krb="http://karabo.eu/scene" krb:version="2">
        <svg:rect krb:class="DisplayComponent" krb:widget="${name}"
          krb:keys="DEV.enabled" x="1" y="2" width="30" height="40" ${attribute} />
      </svg:svg>
    `);
    expect(scene.children[0]).toBeInstanceOf(Model);
    expect(scene.children[0]).toMatchObject({
      klass: name,
      parent_component: 'DisplayComponent',
      keys: ['DEV.enabled'],
      x: 1,
      y: 2,
      width: 30,
      height: 40,
      invert,
    });
  }
  expect(new Model().invert).toBe(false);
});

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
