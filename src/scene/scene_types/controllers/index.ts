/**
 *
 * Barrel export for all controller widgets
 */

export * from './display';
export * from './editable';

import { DisplayControllerProps } from './display';
import { EditableControllerProps } from './editable';

/**
 * Union of ALL controller widgets (display + editable)
 */
export type ControllerTypeProps =
  | DisplayControllerProps
  | EditableControllerProps;
