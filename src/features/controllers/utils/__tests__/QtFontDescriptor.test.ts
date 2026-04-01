import { getQFontTextStyle, getControllerFontStyle, QFont } from '../fonts';
import {
  FONT_FAMILY_DEFAULT,
  FONT_FAMILY_MONOSPACED,
  FONT_FAMILY_SERIF,
} from '@/karabo/common/api';

describe('QtFontDescriptor constructor', () => {
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

  test.each(validQtDescriptors)(
    'initializes successfully with valid descriptors: %p',
    (elem) => {
      const inst = new QFont(elem['input']);
      expect(inst).toBeInstanceOf(QFont);
      expect(inst).toEqual(elem['expected']);
    }
  );

  test('Valid QtFontDescriptors generate expected CSS', () => {
    let qtFontDescriptor = new QFont('Source Code Pro,10,-1,5,50,0,0,0,0,0');
    expect(qtFontDescriptor.css_fontFamily).toEqual(FONT_FAMILY_MONOSPACED);
    expect(qtFontDescriptor.css_fontSize).toEqual('10pt');
    expect(qtFontDescriptor.css_fontStyle).toEqual('normal');
    expect(qtFontDescriptor.css_fontWeight).toEqual('normal');
    expect(qtFontDescriptor.css_textDecoration).toEqual('none');

    qtFontDescriptor = new QFont('Source Serif Pro,-1,12,5,75,0,1,0,0,0');
    expect(qtFontDescriptor.css_fontFamily).toEqual(FONT_FAMILY_SERIF);
    expect(qtFontDescriptor.css_fontSize).toEqual('12px');
    expect(qtFontDescriptor.css_fontStyle).toEqual('normal');
    expect(qtFontDescriptor.css_fontWeight).toEqual('bold');
    expect(qtFontDescriptor.css_textDecoration).toEqual('underline');
  });

  test('Sized font text styles resolve numeric scene font sizes to points', () => {
    expect(getControllerFontStyle(10, 'bold')).toMatchObject({
      fontFamily: FONT_FAMILY_DEFAULT,
      fontSize: '10pt',
      fontWeight: 'bold',
      fontStyle: 'normal',
      textDecoration: 'none',
    });
  });

  test('QFont text styles resolve descriptor-based font styling', () => {
    expect(
      getQFontTextStyle('Source Code Pro,10,-1,5,50,0,0,0,0,0')
    ).toMatchObject({
      fontFamily: FONT_FAMILY_MONOSPACED,
      fontSize: '10pt',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
    });
  });

  test('Sized font text styles warn on negative numeric font sizes', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getControllerFontStyle(-4, 'normal')).toMatchObject({
      fontFamily: FONT_FAMILY_DEFAULT,
      fontSize: '10pt',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
    });

    expect(getControllerFontStyle(0, 'normal')).toMatchObject({
      fontFamily: FONT_FAMILY_DEFAULT,
      fontSize: '10pt',
    });

    expect(warnSpy).toHaveBeenCalledWith(
      '[QFont] Invalid scene font size "-4". Falling back to default font size 10pt.'
    );
    expect(warnSpy).toHaveBeenCalledWith(
      '[QFont] Invalid scene font size "0". Falling back to default font size 10pt.'
    );

    warnSpy.mockRestore();
  });
});
