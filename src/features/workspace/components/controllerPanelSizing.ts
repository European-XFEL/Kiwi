import type { ControllerPanelModel } from '../types';

export const CONTROLLER_PANEL_HEADER_HEIGHT = 28;
export const CONTROLLER_PANEL_SEPARATOR_HEIGHT = 8;

export function getDefaultControllerPanelHeight(
  panel: ControllerPanelModel
): number {
  return Math.max(panel.model.height, 400) + CONTROLLER_PANEL_HEADER_HEIGHT;
}
