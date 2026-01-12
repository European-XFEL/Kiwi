import { BaseWidgetElementModel } from './BaseModels';
import type { LabelProps } from '../scene_types/staticWidgets';
import {
  FONT_BASE_SIZE,
  FONT_FAMILY_DEFAULT,
} from '@/controllers/utils/fontDefaults';
import { QtFontDescriptor } from '@/scene/utils/QtFontDescriptor';

export class LabelModel extends BaseWidgetElementModel<LabelProps> {
  text = '';
  background = '#FFFFFF';
  foreground = '#000000';
  frame_width = 0;
  font_family = FONT_FAMILY_DEFAULT;
  font_size: number | string = FONT_BASE_SIZE;
  font_weight = 'normal';
  font_style = 'normal';
  text_decoration = 'none';
  alignment: 'left' | 'center' | 'right' = 'left';

  /**
   * Parse and apply a Qt font descriptor string to this label.
   * Example: "Source Sans Pro,10,-1,5,50,0,0,0,0,0"
   * This handles font family mapping, pt/px sizing, weight, italic, underline, strikeout.
   */
  applyFontDescriptor(descriptorString: string): void {
    try {
      const fontDescriptor = new QtFontDescriptor(descriptorString);
      this.font_family = fontDescriptor.css_fontFamily;
      this.font_size = fontDescriptor.css_fontSize;
      this.font_style = fontDescriptor.css_fontStyle;
      this.font_weight = fontDescriptor.css_fontWeight;
      this.text_decoration = fontDescriptor.css_textDecoration;
    } catch (error) {
      console.warn(
        `Failed to parse font descriptor: "${descriptorString}"`,
        error
      );
      // Keep default values on parse failure
    }
  }

  get props(): LabelProps {
    return {
      element_type: 'widget',
      widget_type: 'Label',
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      text: this.text,
      background: this.background,
      foreground: this.foreground,
      frame_width: this.frame_width,
      font_family: this.font_family,
      font_size: this.font_size,
      font_weight: this.font_weight,
      font_style: this.font_style,
      text_decoration: this.text_decoration,
      alignment: this.alignment,
      layout_data: this.layout_data,
    };
  }
}
