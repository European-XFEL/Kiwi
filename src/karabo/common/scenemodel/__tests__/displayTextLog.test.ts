import { DisplayTextLogModel, readScene } from '../api';

test('reads DisplayTextLog widget keys and geometry from a DisplayComponent', () => {
  const scene = readScene(`
    <svg:svg xmlns:svg="http://www.w3.org/2000/svg" xmlns:krb="http://karabo.eu/scene" krb:version="2">
      <svg:rect krb:class="DisplayComponent" krb:widget="DisplayTextLog"
        krb:keys="DEV.log" x="1" y="2" width="30" height="40" />
    </svg:svg>
  `);

  const model = scene.children[0] as DisplayTextLogModel;
  expect(model).toBeInstanceOf(DisplayTextLogModel);
  expect(model.klass).toBe('DisplayTextLog');
  expect(model.parent_component).toBe('DisplayComponent');
  expect(model.keys).toEqual(['DEV.log']);
  expect(model).toMatchObject({ x: 1, y: 2, width: 30, height: 40 });
});
