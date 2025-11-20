import * as React from "react";
import type { EditableListProps } from "@/scene/scene_types/controllers";
import DeviceOfflineOverlay from "@/components/DeviceOfflineOverlay";
import { useKaraboPropertyInfo } from "@/components/shared/hooks/useKaraboProperty";
import { useDeviceOnlineStatus } from "@/components/shared/hooks/useDeviceOnlineStatus";
import { useKaraboKeysString } from "@/components/shared/hooks/useKaraboKeysString";
import { FONT_FAMILY_DEFAULT } from "@/components/shared/helpers/fontDefaults";
import { SquarePen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePropertyPermissions } from "@/components/shared/hooks/usePropertyPermission";
import type { PropertyInfoOptional } from "@/karabo_data/DeviceConfigInfo";

/**
 * EditableList - List editor for VectorBinding properties.
 *
 * Editability rules:
 * - Device must be online
 * - User access level must satisfy property.schemaAttrs.requiredAccessLevel
 * - Property accessMode must allow editing (ReadOnly / InitOnly / Reconfigurable)
 */
const EditableList: React.FC<EditableListProps> = (props) => {
  const { keys, x, y, width, height, font_size, font_weight } = props;

  // Join keys for compatibility with hooks
  const joinedKeys = useKaraboKeysString(keys);
  const { deviceId, property } = useKaraboPropertyInfo(joinedKeys);
  const offline = useDeviceOnlineStatus(deviceId);

  // Narrow to our “maybe PropertyInfo, maybe null/undefined” type
  const propertyOptional = property as PropertyInfoOptional;

  // Centralized permission logic
  const { canEdit, disabledReason } = usePropertyPermissions(propertyOptional);

  const [value, setValue] = React.useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  // Sync with property changes
  React.useEffect(() => {
    if (!propertyOptional) {
      setValue("");
      return;
    }

    const incoming =
      propertyOptional.value ??
      propertyOptional.schemaAttrs?.defaultValue ??
      [];

    if (Array.isArray(incoming)) {
      // Convert array to comma-separated string
      setValue(incoming.join(", "));
    } else {
      setValue(String(incoming));
    }
  }, [propertyOptional]);

  // Show offline overlay when device is not connected
  if (offline) {
    return (
      <DeviceOfflineOverlay
        keys={keys}
        x={x}
        y={y}
        width={width}
        height={height}
        key={`overlay-${joinedKeys}`}
      />
    );
  }

  const finalCanEdit = canEdit;

  return (
    <div
      className="absolute flex items-center gap-1 ml-1"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        onBlur={(e) => {
          // Parse comma-separated values
          const items = e.target.value
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
          setValue(items.join(", "));
          // TODO: push array value to backend or GUI server via WebSocket
        }}
        disabled={!finalCanEdit}
        title={!finalCanEdit ? disabledReason : ""}
        className={`border border-solid rounded px-1 flex-1 ${
          finalCanEdit
            ? "text-black bg-white cursor-text"
            : "text-gray-500 bg-gray-100 cursor-not-allowed"
        }`}
        style={{
          fontFamily: FONT_FAMILY_DEFAULT,
          fontSize: font_size,
          fontWeight: font_weight.toLowerCase(),
          minWidth: 0,
        }}
        placeholder={finalCanEdit ? "item1, item2, item3" : "Read-only"}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            disabled={!finalCanEdit}
            title={!finalCanEdit ? disabledReason : "Edit list"}
            className={`h-5 w-5 p-0 border-none ${
              finalCanEdit
                ? "hover:bg-orange-50 cursor-pointer"
                : "opacity-50 cursor-not-allowed"
            }`}
          >
            <SquarePen className="h-3 w-3" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit List</DialogTitle>
          </DialogHeader>
          {/* Dialog content will be implemented later */}
          <div className="p-4 text-gray-500">
            List editor dialog (to be implemented)
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditableList;
