/**
 * EditableList - controller component
 */

import * as React from 'react';
import type { EditableListProps } from '@/scene/scene_types/controllers';
import { FONT_FAMILY_DEFAULT } from '@/components/shared/helpers/fontDefaults';
import { SquarePen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const EditableList: React.FC<EditableListProps> = ({
  font_size,
  font_weight,
  tooltipText,
  disabledReason,
  isEnabled,
  primary,
}) => {
  const value = primary?.value;
  const schemaAttrs = primary?.schemaAttrs;

  const [localValue, setLocalValue] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  React.useEffect(() => {
    const incoming = value ?? schemaAttrs?.defaultValue ?? [];
    setLocalValue(
      Array.isArray(incoming) ? incoming.join(', ') : String(incoming)
    );
  }, [value, schemaAttrs?.defaultValue]);

  return (
    <div
      className="flex items-center gap-1 w-full h-full"
      title={tooltipText || disabledReason || primary?.propertyIndicator?.label}
    >
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={(e) => {
          const items = e.target.value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
          setLocalValue(items.join(', '));
        }}
        disabled={!isEnabled}
        className={`w-full h-full border border-solid rounded px-1 min-w-0 ${
          isEnabled
            ? 'text-black bg-white cursor-text'
            : 'text-gray-500 bg-gray-100 cursor-not-allowed'
        }`}
        style={{
          fontFamily: FONT_FAMILY_DEFAULT,
          fontSize: font_size,
          fontWeight: font_weight?.toLowerCase(),
        }}
        placeholder={isEnabled ? 'item1, item2, item3' : 'Read-only'}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            disabled={!isEnabled}
            title={!isEnabled ? disabledReason : 'Edit list'}
            className={`h-6 w-6 p-0 shrink-0 self-center ${
              isEnabled ? 'hover:bg-orange-50' : 'opacity-50 cursor-not-allowed'
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
    </div>
  );
};

export default EditableList;
