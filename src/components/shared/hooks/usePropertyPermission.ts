import { useMemo } from "react";
import { AccessLevel, AccessMode } from "@/karabo_data/SchemaEnums";
import { useAccessLevel } from "@/components/shared/hooks/useAccessLevel";
import {
  PropertyPermissions,
  type PropertyPermissionResult,
} from "@/shared/helpers/PropertyPermissions";
import { PropertyInfoOptional } from "@/karabo_data/DeviceConfigInfo";

export interface UsePropertyPermissionsResult extends PropertyPermissionResult {
  disabledReason: string;
}

/**
 * Hook wrapper around PropertyPermissions.getPermissions
 * that also generates a human-readable disabledReason string.
 */
export function usePropertyPermissions(
  property: PropertyInfoOptional
): UsePropertyPermissionsResult {
  const { accessLevel } = useAccessLevel();

  const perms = useMemo(
    () => PropertyPermissions.getPermissions(property, accessLevel),
    [property, accessLevel]
  );

  const disabledReason = useMemo(() => {
    if (perms.canEdit) return "";

    // Mode-based reasons first (ReadOnly / InitOnly)
    if (perms.deniedByMode) {
      if (perms.accessMode === AccessMode.ReadOnly) {
        return "Property is read-only and cannot be edited from the GUI";
      }
      if (perms.accessMode === AccessMode.InitOnly) {
        return "Property is InitOnly and can only be configured via the device run file";
      }
      return "Property is not editable in the current configuration";
    }

    // Then access-level reasons
    if (perms.deniedByLevel && perms.requiredAccessLevel !== undefined) {
      return `Requires access level ${
        AccessLevel[perms.requiredAccessLevel]
      } or higher`;
    }

    // Fallback
    return "Insufficient permissions to modify this property";
  }, [perms]);

  return {
    ...perms,
    disabledReason,
  };
}
