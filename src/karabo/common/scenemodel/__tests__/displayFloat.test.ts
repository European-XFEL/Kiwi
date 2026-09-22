import { DisplayFloatModel, readScene } from '../api';

test.each([
  ['DisplayFloat', 'krb:decimals="3"', '3'],
  ['DisplayAlarmFloat', 'krb:decimals="0"', '0'],
  ['DisplayFloat', '', '8'],
  ['DisplayAlarmFloat', '', '8'],
])('%s reads %s as string precision %s', (widget, attribute, expected) => {
  const scene = readScene(`
    <svg:svg xmlns:svg="http://www.w3.org/2000/svg" xmlns:krb="http://karabo.eu/scene" krb:version="2">
      <svg:rect krb:class="DisplayComponent" krb:widget="${widget}" ${attribute} />
    </svg:svg>
  `);
  expect((scene.children[0] as DisplayFloatModel).decimals).toBe(expected);
});
