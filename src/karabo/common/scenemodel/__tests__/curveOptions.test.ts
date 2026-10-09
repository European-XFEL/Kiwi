import { readScene } from '../api';
import { buildModelConfig } from '@/features/controllers/graph/common/api';

test.each([
  'VectorGraph',
  'NDArrayGraph',
  'DisplayTrendGraph',
  'DisplayStateGraph',
  'DisplayAlarmGraph',
])(
  '%s reads only direct Karabo curve options with desktop attributes',
  (widget) => {
    const read = (children = '') =>
      readScene(`
      <svg:svg xmlns:svg="http://www.w3.org/2000/svg" xmlns:krb="http://karabo.eu/scene" krb:version="2">
        <svg:rect krb:class="DisplayComponent" krb:widget="${widget}" krb:keys="DEV.a,DEV.b">
          ${children}
        </svg:rect>
      </svg:svg>
    `).children[0];
    expect(buildModelConfig(read()).curve_options).toEqual([]);
    const config = buildModelConfig(
      read(`
      <krb:curve_options key="DEV.a" name="Saved" pen_color="#123456" curve_type="1" />
      <krb:curve_options key="DEV.b" name="" curve_type="2" />
      <krb:curve_options key="DEV.unmatched" name="Other" pen_color=" " curve_type="1" />
      <krb:curve_options key="DEV.c" curve_type="1" />
      <krb:curve_options key="DEV.bad" name="Ignored" curve_type="3" />
      <krb:curve_options krb:key="DEV.a" krb:name="Wrong attributes" krb:curve_type="1" />
      <curve_options key="DEV.a" name="Wrong namespace" curve_type="1" />
      <krb:other key="DEV.a" name="Wrong tag" curve_type="1" />
      <krb:other><krb:curve_options key="DEV.a" name="Nested" curve_type="1" /></krb:other>
    `)
    );
    expect(config.curve_options).toEqual([
      { key: 'DEV.a', name: 'Saved', pen_color: '#123456', curve_type: 1 },
      { key: 'DEV.b', name: '', pen_color: '', curve_type: 2 },
      { key: 'DEV.unmatched', name: 'Other', pen_color: ' ', curve_type: 1 },
      { key: 'DEV.c', name: '', pen_color: '', curve_type: 1 },
    ]);
  }
);
