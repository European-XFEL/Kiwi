import React from 'react';
import { Button } from '@/components/api';
import pointerIcon from '@/assets/icons/general/pointer.svg?url';
import zoomIcon from '@/assets/icons/general/zoom.svg?url';
import moveIcon from '@/assets/icons/general/move.svg?url';
import resetIcon from '@/assets/icons/general/reset.svg?url';

export type GraphMouseTool = 'pointer' | 'zoom' | 'pan';

const MOUSE_TOOLS = [
  { tool: 'pointer', label: 'Pointer', icon: pointerIcon },
  { tool: 'zoom', label: 'Zoom', icon: zoomIcon },
  { tool: 'pan', label: 'Move', icon: moveIcon },
] as const;

export const GraphToolbar = React.memo(function GraphToolbar({
  tool: selectedTool,
  selectTool,
  reset,
}: {
  tool: GraphMouseTool;
  selectTool: (tool: GraphMouseTool) => void;
  reset: () => void;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Graph controls"
      className="flex w-8 shrink-0 flex-col items-center bg-transparent"
    >
      {[
        ...MOUSE_TOOLS.map(({ tool, label, icon }) => ({
          label,
          icon,
          checked: selectedTool === tool,
          onClick: () => selectTool(tool),
        })),
        {
          label: 'Reset view',
          icon: resetIcon,
          checked: undefined,
          onClick: reset,
        },
      ].map(({ label, icon, checked, onClick }) => (
        <Button
          key={label}
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          title={label}
          aria-pressed={checked}
          className="h-7 w-7 rounded-sm border border-transparent aria-pressed:border-slate-500 aria-pressed:bg-slate-200"
          onClick={onClick}
        >
          <img src={icon} alt="" className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );
});
