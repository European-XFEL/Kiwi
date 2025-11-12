import {
  FONT_BASE_SIZE,
  FONT_FAMILY_DEFAULT,
  FONT_FAMILY_MONOSPACED,
  FONT_FAMILY_SERIF,
} from "./fontDefaults";

/**
 * A Qt Font Descriptor is a single string with comma separated values for
 * the font attributes. For example the font descriptor below has the following
 * fields:
 *
 * "Source Sans Pro,10,-1,5,50,0,0,0,0,0"
 *
 * 1. Font family (e.g., Source Sans Pro)
 * 2. Point size (e.g., 10)
 * 3. Pixel size (e.g., -1, meaning not set)
 * 4. Style hint (e.g., 5)
 * 5. Weight (e.g., 50)
 * 6. Italic (e.g., 0 for false)
 * 7. Underline (e.g., 0 for false)
 * 8. StrikeOut (e.g., 0 for false)
 * 9. FixedPitch (e.g., 0 for false)
 * 10. RawMode (e.g., 0 for false)
 */
export class QtFontDescriptor {
  fontFamily: string;
  pointSize: number;
  pixelSize: number;
  weight: number;
  italic: number;
  underline: number;
  strikeOut: number;
  fixedPitch: number;
  rawMode: number;

  constructor(readonly descriptor: string) {
    const parts = descriptor.split(",");
    if (parts.length < 10) {
      throw new Error(
        `Qt font descriptor should have at least 10 comma separated fields. '${descriptor}' has ${parts.length}.`
      );
    }
    this.fontFamily = parts[0];
    this.pointSize = parseInt(parts[1]);
    throwIfNaN(this.pointSize, "pointSize", parts[1]);
    this.pixelSize = parseInt(parts[2]);
    throwIfNaN(this.pixelSize, "pixelSize", parts[2]);
    this.weight = parseInt(parts[4]);
    throwIfNaN(this.weight, "weight", parts[4]);
    this.italic = parseInt(parts[5]);
    throwIfNaN(this.italic, "italic", parts[5]);
    this.underline = parseInt(parts[6]);
    throwIfNaN(this.underline, "underline", parts[6]);
    this.strikeOut = parseInt(parts[7]);
    throwIfNaN(this.strikeOut, "strikeOut", parts[7]);
    this.fixedPitch = parseInt(parts[8]);
    throwIfNaN(this.fixedPitch, "fixedPitch", parts[8]);
    this.rawMode = parseInt(parts[9]);
    throwIfNaN(this.rawMode, "rawMode", parts[9]);

    function throwIfNaN(
      parsedValue: number,
      fieldName: string,
      fieldValue: string
    ) {
      if (isNaN(parsedValue)) {
        throw `${fieldName} in field descriptor, ${fieldValue}, is not a valid integer`;
      }
    }
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
    // GUI Client saves "Monospaced" as "Source Code Pro"
    if (this.fontFamily.includes("Code")) {
      return FONT_FAMILY_MONOSPACED;
    }
    // GUI Client saves "Serif" as "Source Serif Pro"
    if (this.fontFamily.includes("Serif")) {
      return FONT_FAMILY_SERIF;
    }
    // The remaining possibility for the GUI Client is "Sans-Serif", which
    // is saved as "Source Sans Pro"
    return FONT_FAMILY_DEFAULT;
  }

  get css_textDecoration(): string {
    let textDecoration = "";
    if (this.underline != 0) {
      textDecoration = "underline";
    }
    if (this.strikeOut != 0) {
      textDecoration = `${textDecoration} line-through`;
    }
    if (textDecoration.length == 0) {
      textDecoration = "none";
    }
    return textDecoration;
  }

  get css_fontStyle(): string {
    return this.italic != 0 ? "italic" : "normal";
  }

  get css_fontWeight(): string {
    return this.weight > 50 ? "bold" : "normal";
  }
}
