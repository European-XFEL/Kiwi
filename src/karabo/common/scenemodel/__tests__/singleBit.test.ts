import { SingleBitModel, readScene } from '../api';

test.each([
  ['', 0, false],
  ['krb:bit="0" krb:invert="false"', 0, false],
  ['krb:bit="7" krb:invert="true"', 7, true],
  ['krb:bit="63" krb:invert="True"', 63, true],
] as const)('reads SingleBit attributes %s', (attributes, bit, invert) => {
  const scene = readScene(`
    <svg:svg xmlns:svg="http://www.w3.org/2000/svg" xmlns:krb="http://karabo.eu/scene" krb:version="2">
      <svg:rect krb:class="DisplayComponent" krb:widget="SingleBit"
        krb:keys="DEV.status" x="1" y="2" width="15" height="21" ${attributes} />
    </svg:svg>
  `);
  expect(scene.children[0]).toBeInstanceOf(SingleBitModel);
  expect(scene.children[0]).toMatchObject({
    klass: 'SingleBit',
    parent_component: 'DisplayComponent',
    keys: ['DEV.status'],
    x: 1,
    y: 2,
    width: 15,
    height: 21,
    bit,
    invert,
  });
});

test('defaults to bit zero without inversion', () => {
  expect(new SingleBitModel()).toMatchObject({ bit: 0, invert: false });
});
