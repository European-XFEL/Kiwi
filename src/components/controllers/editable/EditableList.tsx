import * as React from "react";
import type { EditableListProps } from "@/scene/scene_types/controllers";
import { ControllerContainer } from "@/components/sceneView/ControllerContainer";
import { useControllerPermissions } from "@/components/shared/hooks/useControllerPermissions";
import { useKaraboPropertyInfo } from "@/components/shared/hooks/useKaraboProperty";
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
import type { PropertyInfoOptional } from "@/karabo_data/DeviceConfigInfo";

/**
 * Inner component: actually renders the input and uses permissions context.
 * This is rendered *inside* ControllerContainer, so the context is available.
 */
const EditableListInner: React.FC<{
  propertyOptional: PropertyInfoOptional;
  font_size?: number;
  font_weight: string;
}> = ({ propertyOptional, font_size, font_weight }) => {
  const { canEdit, disabledReason } = useControllerPermissions();

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
      setValue(incoming.join(", "));
    } else {
      setValue(String(incoming));
    }
  }, [propertyOptional]);

  return (
    <>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          if (!canEdit) return; // extra safety
          setValue(e.target.value);
        }}
        onBlur={(e) => {
          if (!canEdit) return;

          const items = e.target.value
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item.length > 0);

          setValue(items.join(", "));
          // TODO: push array value to backend / GUI server
        }}
        disabled={!canEdit}
        title={!canEdit ? disabledReason : ""}
        className={`border border-solid rounded px-1 flex-1 w-full ${
          canEdit
            ? "text-black bg-white cursor-text"
            : "text-gray-500 bg-gray-100 cursor-not-allowed"
        }`}
        style={{
          fontFamily: FONT_FAMILY_DEFAULT,
          fontSize: font_size,
          fontWeight: font_weight.toLowerCase(),
          minWidth: 0,
        }}
        placeholder={canEdit ? "item1, item2, item3" : "Read-only"}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            disabled={!canEdit}
            title={!canEdit ? disabledReason : "Edit list"}
            className={`h-5 w-5 p-0 border-none ${
              canEdit
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
          <div className="p-4 text-gray-500">
            List editor dialog (to be implemented)
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

/**
 * Outer component: wires keys → ControllerContainer and passes property down.
 * ControllerContainer handles overlays + calculates permissions via usePropertyPermissions.
 */
const EditableList: React.FC<EditableListProps> = (props) => {
  const { keys, x, y, width, height, font_size, font_weight } = props;

  const joinedKeys = useKaraboKeysString(keys);
  const { property } = useKaraboPropertyInfo(joinedKeys);
  const propertyOptional = property as PropertyInfoOptional;

  return (
    <ControllerContainer
      keys={keys}
      x={x}
      y={y}
      width={width}
      height={height}
      className="flex items-center gap-1 ml-1"
      showMissingPropertyOverlay
    >
      <EditableListInner
        propertyOptional={propertyOptional}
        font_size={font_size as number}
        font_weight={font_weight}
      />
    </ControllerContainer>
  );
};

export default EditableList;
