import { QtFontDescriptor } from '../QtFontDescriptor';
import {
  FONT_FAMILY_MONOSPACED,
  FONT_FAMILY_SERIF,
} from '@/controllers/utils/fontDefaults';

describe('QtFontDescriptor constructor', () => {
  const tooFewFields = [
    '',
    'a,b,c',
    'one,two,three,four,five',
    '1,2,3,4,5,6,7,8,9', // 9 parts
    'onlyonepart',
  ];

  const invalidFields = [
    '1,false,3,4,5,6,7,8,9,10',
    'Source Sans Pro,10,-1,5,50,false,0,0,0,0',
  ];

  const validQtDescriptors = [
    {
      input: 'Source Sans Pro,10,-1,5,50,0,0,0,0,0',
      expected: {
        // Note: descriptor is needed even though it is not a member of QtFontDescriptor
        descriptor: 'Source Sans Pro,10,-1,5,50,0,0,0,0,0',
        fontFamily: 'Source Sans Pro',
        pointSize: 10,
        pixelSize: -1,
        weight: 50,
        italic: 0,
        underline: 0,
        strikeOut: 0,
        fixedPitch: 0,
        rawMode: 0,
      },
    },
    {
      input: 'Source Serif Pro,-1,12,5,75,0,1,0,0,0',
      expected: {
        // Note: descriptor is needed even though it is not a member of QtFontDescriptor
        descriptor: 'Source Serif Pro,-1,12,5,75,0,1,0,0,0',
        fontFamily: 'Source Serif Pro',
        pointSize: -1,
        pixelSize: 12,
        weight: 75,
        italic: 0,
        underline: 1,
        strikeOut: 0,
        fixedPitch: 0,
        rawMode: 0,
      },
    },
  ];

  test.each(tooFewFields)(
    'throws when given an input with less than 10 comma-separated parts: %p',
    (input) => {
      expect(() => new QtFontDescriptor(input)).toThrow(
        /10 comma separated fields/
      );
    }
  );

  test.each(invalidFields)(
    'throws when at least one part is not of the expected type: %p',
    (input) => {
      expect(() => new QtFontDescriptor(input)).toThrow();
    }
  );

  test.each(validQtDescriptors)(
    'initializes successfully with valid descriptors: %p',
    (elem) => {
      const inst = new QtFontDescriptor(elem['input']);
      expect(inst).toBeInstanceOf(QtFontDescriptor);
      expect(inst).toEqual(elem['expected']);
    }
  );

  test('Valid QtFontDescriptors generate expected CSS', () => {
    let qtFontDescriptor = new QtFontDescriptor(
      'Source Code Pro,10,-1,5,50,0,0,0,0,0'
    );
    expect(qtFontDescriptor.css_fontFamily).toEqual(FONT_FAMILY_MONOSPACED);
    expect(qtFontDescriptor.css_fontSize).toEqual('10pt');
    expect(qtFontDescriptor.css_fontStyle).toEqual('normal');
    expect(qtFontDescriptor.css_fontWeight).toEqual('normal');
    expect(qtFontDescriptor.css_textDecoration).toEqual('none');

    qtFontDescriptor = new QtFontDescriptor(
      'Source Serif Pro,-1,12,5,75,0,1,0,0,0'
    );
    expect(qtFontDescriptor.css_fontFamily).toEqual(FONT_FAMILY_SERIF);
    expect(qtFontDescriptor.css_fontSize).toEqual('12px');
    expect(qtFontDescriptor.css_fontStyle).toEqual('normal');
    expect(qtFontDescriptor.css_fontWeight).toEqual('bold');
    expect(qtFontDescriptor.css_textDecoration).toEqual('underline');
  });
});
