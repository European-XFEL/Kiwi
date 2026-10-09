import { LampModel, readScene } from '../api';

test('reads a Lamp display binding and its scene geometry', () => {
  const scene = readScene(`
    <svg:svg xmlns:svg="http://www.w3.org/2000/svg" xmlns:krb="http://karabo.eu/scene" krb:version="2">
      <svg:rect krb:class="DisplayComponent" krb:widget="Lamp"
        krb:keys="DEV.status" x="4" y="5" width="30" height="40" />
    </svg:svg>
  `);

  expect(scene.children[0]).toBeInstanceOf(LampModel);
  expect(scene.children[0]).toMatchObject({
    klass: 'Lamp',
    parent_component: 'DisplayComponent',
    keys: ['DEV.status'],
    x: 4,
    y: 5,
    width: 30,
    height: 40,
  });
});
