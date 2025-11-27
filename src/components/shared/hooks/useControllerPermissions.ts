import { useContext, createContext } from "react";

/**
 * Context value for controller permissions and editability state
 */
export interface ControllerPermissionsContext {
  /** Whether the widget can be edited (considers device online + user permissions) */
  canEdit: boolean;
  /** Human-readable reason why editing is disabled (if canEdit is false) */
  disabledReason?: string;
}

export const ControllerPermissionsContext =
  createContext<ControllerPermissionsContext>({
    canEdit: true,
    disabledReason: undefined,
  });

/**
 * Hook to access controller permissions from within a widget
 * Only works for editable widgets wrapped in ControllerContainer with checkPermissions={true}
 */
export const useControllerPermissions = () => {
  return useContext(ControllerPermissionsContext);
};
