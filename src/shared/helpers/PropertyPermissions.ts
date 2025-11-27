import type { PropertyInfo } from "@/karabo_data/DeviceConfigInfo";
import { AccessLevel, AccessMode } from "@/karabo_data/SchemaEnums";

export interface PropertyPermissionResult {
  canEdit: boolean;
  requiredAccessLevel: AccessLevel;
  accessMode?: AccessMode;
  deniedByLevel: boolean;
  deniedByMode: boolean;
  debugLabel?: string;
}

/**
 * Compute whether a property is editable in the GUI.
 *
 * Rules:
 * - ReadOnly:     never editable from GUI
 * - InitOnly:     never editable from GUI (run-file only)
 * - Reconfigurable / Undefined: editable if user level >= requiredAccessLevel
 */
export class PropertyPermissions {
  static getPermissions(
    property: PropertyInfo | null | undefined,
    currentLevel: AccessLevel
  ): PropertyPermissionResult {
    const debugLabel = property?.key ?? "<no-property>";

    // No property: cannot edit, treated as mode-denied
    if (!property) {
      return {
        canEdit: false,
        requiredAccessLevel: AccessLevel.Observer,
        accessMode: undefined,
        deniedByLevel: false,
        deniedByMode: true,
        debugLabel,
      };
    }

    const requiredAccessLevel =
      property.schemaAttrs?.requiredAccessLevel ?? AccessLevel.Observer;

    const accessMode =
      property.schemaAttrs?.accessMode ?? AccessMode.Reconfigurable;

    // DEBUG: Check if schema attrs are missing
    if (!property.schemaAttrs) {
      console.warn(
        `[PropertyPermissions] Property "${property.key}" has NO schemaAttrs! ` +
        `Defaulting to requiredAccessLevel=Observer, accessMode=Reconfigurable`
      );
    } else {
      console.log(
        `[PropertyPermissions] Property "${property.key}":`,
        `requiredAccessLevel=${AccessLevel[requiredAccessLevel]},`,
        `accessMode=${AccessMode[accessMode]},`,
        `currentLevel=${AccessLevel[currentLevel]},`,
        `canEdit=${currentLevel >= requiredAccessLevel && accessMode === AccessMode.Reconfigurable}`
      );
    }

    // 1) Mode-based eligibility
    let canEditByMode = false;
    let deniedByMode = false;

    switch (accessMode) {
      case AccessMode.ReadOnly:
        // Never editable from GUI
        console.debug(
          "[PropertyPermissions] NOT editable (ReadOnly)",
          debugLabel
        );
        canEditByMode = false;
        deniedByMode = true;
        break;

      case AccessMode.InitOnly:
        // Also never editable from GUI; only configurable via run file
        console.debug(
          "[PropertyPermissions] NOT editable (InitOnly – run-file only)",
          debugLabel
        );
        canEditByMode = false;
        deniedByMode = true;
        break;

      case AccessMode.Reconfigurable:
      case AccessMode.Undefined:
      default:
        // Editable *if* access level allows it
        canEditByMode = true;
        deniedByMode = false;
        break;
    }

    // 2) Access-level check
    const canEditByLevel = currentLevel >= requiredAccessLevel;
    const deniedByLevel = !canEditByLevel;

    const canEdit = canEditByMode && canEditByLevel;

    return {
      canEdit,
      requiredAccessLevel,
      accessMode,
      deniedByLevel,
      deniedByMode,
      debugLabel,
    };
  }
}
