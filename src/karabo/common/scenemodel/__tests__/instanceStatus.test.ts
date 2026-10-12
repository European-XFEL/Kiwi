import { InstanceStatusModel, readScene } from '../api';

test.each([
  'krb:class="InstanceStatus"',
  'krb:class="DisplayComponent" krb:widget="InstanceStatus"',
])('reads instance status geometry and keys from %s', (attributes) => {
  const scene = readScene(`
      <svg:svg xmlns:svg="http://www.w3.org/2000/svg" xmlns:krb="http://karabo.eu/scene" krb:version="2">
        <svg:rect ${attributes} krb:keys="DEV.state,OTHER.state"
          x="4" y="5" width="30" height="40" />
      </svg:svg>
    `);
  expect(scene.children[0]).toBeInstanceOf(InstanceStatusModel);
  expect(scene.children[0]).toMatchObject({
    klass: 'InstanceStatus',
    keys: ['DEV.state', 'OTHER.state'],
    x: 4,
    y: 5,
    width: 30,
    height: 40,
  });
});
