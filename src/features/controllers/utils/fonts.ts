import type { CSSProperties } from 'react';
import {
  FONT_BASE_SIZE,
  FONT_FAMILY_DEFAULT,
  FONT_FAMILY_MONOSPACED,
  FONT_FAMILY_SERIF,
  FONT_SIZE_DEFAULT,
} from '@/karabo/common/api';

const DEFAULT_QFONT_DESCRIPTOR = 'Source Sans Pro,10,-1,5,50,0,0,0,0,0';

type ParsedQFont = {
  fontFamily: string;
  pointSize: number;
  pixelSize: number;
  weight: number;
  italic: number;
  underline: number;
  strikeOut: number;
  fixedPitch: number;
  rawMode: number;
};

const DEFAULT_PARSED_QFONT: ParsedQFont = {
  fontFamily: 'Source Sans Pro',
  pointSize: 10,
  pixelSize: -1,
  weight: 50,
  italic: 0,
  underline: 0,
  strikeOut: 0,
  fixedPitch: 0,
  rawMode: 0,
};

export function parseQFont(descriptor: string): ParsedQFont {
  const parts = descriptor.split(',');

  if (parts.length < 10) {
    console.warn(
      `[QFont] Invalid descriptor "${descriptor}". Expected at least 10 comma-separated fields, got ${parts.length}. Falling back to default font.`
    );
    return DEFAULT_PARSED_QFONT;
  }

  const fontFamily = parts[0];
  const pointSize = parseInt(parts[1], 10);
  const pixelSize = parseInt(parts[2], 10);
  const weight = parseInt(parts[4], 10);
  const italic = parseInt(parts[5], 10);
  const underline = parseInt(parts[6], 10);
  const strikeOut = parseInt(parts[7], 10);
  const fixedPitch = parseInt(parts[8], 10);
  const rawMode = parseInt(parts[9], 10);

  if (
    Number.isNaN(pointSize) ||
    Number.isNaN(pixelSize) ||
    Number.isNaN(weight) ||
    Number.isNaN(italic) ||
    Number.isNaN(underline) ||
    Number.isNaN(strikeOut) ||
    Number.isNaN(fixedPitch) ||
    Number.isNaN(rawMode)
  ) {
    console.warn(
      `[QFont] Invalid descriptor "${descriptor}". One or more numeric fields are invalid. Falling back to default font.`
    );
    return DEFAULT_PARSED_QFONT;
  }

  return {
    fontFamily,
    pointSize,
    pixelSize,
    weight,
    italic,
    underline,
    strikeOut,
    fixedPitch,
    rawMode,
  };
}

/**
 * A QFont is a single string with comma separated values for
 * the font attributes. For example:
 *
 * "Source Sans Pro,10,-1,5,50,0,0,0,0,0"
 *
 * 1. Font family
 * 2. Point size
 * 3. Pixel size
 * 4. Style hint
 * 5. Weight
 * 6. Italic
 * 7. Underline
 * 8. StrikeOut
 * 9. FixedPitch
 * 10. RawMode
 */
export class QFont {
  readonly descriptor: string;
  fontFamily: string;
  pointSize: number;
  pixelSize: number;
  weight: number;
  italic: number;
  underline: number;
  strikeOut: number;
  fixedPitch: number;
  rawMode: number;

  constructor(descriptor: string) {
    const parsed = parseQFont(descriptor);
    const isDefault = parsed === DEFAULT_PARSED_QFONT;

    this.descriptor = isDefault ? DEFAULT_QFONT_DESCRIPTOR : descriptor;
    this.fontFamily = parsed.fontFamily;
    this.pointSize = parsed.pointSize;
    this.pixelSize = parsed.pixelSize;
    this.weight = parsed.weight;
    this.italic = parsed.italic;
    this.underline = parsed.underline;
    this.strikeOut = parsed.strikeOut;
    this.fixedPitch = parsed.fixedPitch;
    this.rawMode = parsed.rawMode;
  }

  get css_fontSize(): string {
    if (this.pointSize > 0) {
      return `${this.pointSize}pt`;
    }
    if (this.pixelSize > 0) {
      return `${this.pixelSize}px`;
    }
    return `${FONT_BASE_SIZE}px`;
  }

  get css_fontFamily(): string {
    if (this.fontFamily.includes('Code')) {
      return FONT_FAMILY_MONOSPACED;
    }
    if (this.fontFamily.includes('Serif')) {
      return FONT_FAMILY_SERIF;
    }
    return FONT_FAMILY_DEFAULT;
  }

  get css_textDecoration(): string {
    const decorations: string[] = [];

    if (this.underline !== 0) {
      decorations.push('underline');
    }
    if (this.strikeOut !== 0) {
      decorations.push('line-through');
    }

    return decorations.length > 0 ? decorations.join(' ') : 'none';
  }

  get css_fontStyle(): string {
    return this.italic !== 0 ? 'italic' : 'normal';
  }

  get css_fontWeight(): string {
    return this.weight > 50 ? 'bolder' : 'normal';
  }
}

export function qtPointSizeToCssPt(pointSize: number): string {
  if (pointSize <= 0) {
    console.warn(
      `[QFont] Invalid scene font size "${pointSize}". Falling back to default font size ${FONT_SIZE_DEFAULT}pt.`
    );
  }

  const normalizedPointSize = pointSize > 0 ? pointSize : FONT_SIZE_DEFAULT;
  return `${normalizedPointSize}pt`;
}

export function getQFontTextStyle(fontSource: string): CSSProperties {
  const font = new QFont(fontSource);
  const fontSize =
    font.pointSize > 0
      ? qtPointSizeToCssPt(font.pointSize)
      : font.pixelSize > 0
        ? `${font.pixelSize}px`
        : `${FONT_BASE_SIZE}px`;

  return {
    fontFamily: font.css_fontFamily,
    fontSize,
    fontWeight: font.css_fontWeight,
    fontStyle: font.css_fontStyle,
    letterSpacing: 'normal',
    textDecoration: font.css_textDecoration,
  };
}

export function getControllerFontStyle(
  font_size: number = 10,
  font_weight: 'normal' | 'bold' = 'normal'
): CSSProperties {
  const fontWeight = font_weight === 'bold' ? 'bolder' : 'normal';
  return {
    fontFamily: FONT_FAMILY_DEFAULT,
    fontSize: qtPointSizeToCssPt(font_size),
    fontWeight: fontWeight,
    fontStyle: 'normal',
    letterSpacing: 'normal',
    textDecoration: 'none',
  };
}
