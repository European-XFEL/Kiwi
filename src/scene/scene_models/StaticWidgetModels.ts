import { BaseWidgetElementModel } from "./BaseModels";
import type { LabelProps } from "../scene_types/staticWidgets";
import {
  FONT_BASE_SIZE,
  FONT_FAMILY_DEFAULT,
} from "@/components/shared/helpers/QtFontDescriptor";

export class LabelModel extends BaseWidgetElementModel<LabelProps> {
  text = "";
  background = "#FFFFFF";
  foreground = "#000000";
  frame_width = 0;
  font_family = FONT_FAMILY_DEFAULT;
  font_size = FONT_BASE_SIZE;
  font_weight = "normal";
  font_style = "normal";
  text_decoration = "none";
  alignment: "left" | "center" | "right" = "left";

  get props(): LabelProps {
    return {
      element_type: "widget",
      widget_type: "Label",
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
