/**
 * Static widget prop definitions (non-interactive display elements).
 * These widgets use only `krb:class` and have no `krb:widget` attribute.
 */

import { BaseWidgetProps } from "./base";

/* ──────────────────────────────────────────────────────────────────────────
 * Label
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Static text label (non-interactive).
 *
 * Example:
 * <svg:rect krb:class="Label"
 *           x="10" y="20" width="100" height="30"
 *           krb:text="Hello World"
 *           krb:font="Source Sans Pro,10,-1,5,50,0,0,0,0,0"
 *           krb:foreground="#000000"
 *           krb:background="transparent"
 *           krb:frameWidth="0"
 *           krb:alignh="4" />
 */
export interface LabelProps extends BaseWidgetProps {
  widget_type: "Label";

  /** Text content */
  text: string;

  /** Colors */
  foreground: string; // Text color
  background: string; // Background color or "transparent"

  /** Font */
  font_family: string; // e.g. "Source Sans Pro"
  font_size: number | string; // e.g. 10 (px) or "10pt" or "12px"
  font_weight: string; // "normal" | "bold"
  font_style: string; // "normal" | "italic"
  text_decoration: string; // "none" | "underline"

  /** Border */
  frame_width: number;

  /** Text alignment */
  alignment: "left" | "center" | "right";
}

/* ──────────────────────────────────────────────────────────────────────────
 * Union Type
 * ────────────────────────────────────────────────────────────────────────── */

/** All static widget prop types (currently only Label). */
export type StaticWidgetProps = LabelProps;
