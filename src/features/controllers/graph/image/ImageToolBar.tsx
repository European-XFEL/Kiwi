import React from 'react';
import { Button } from '@/components/api';
import icons from '@/assets/icons';

import type { MouseTool } from '../types';

const MOUSE_TOOLS = [
  { tool: 'pointer', label: 'Pointer', icon: icons.pointer },
  { tool: 'zoom', label: 'Zoom', icon: icons.zoom },
  { tool: 'pan', label: 'Move', icon: icons.move },
] as const;

export const ImageToolBar = React.memo(function ImageToolBar({
  tool: selectedTool,
  selectTool,
  reset,
  children,
}: {
  tool: MouseTool;
  selectTool: (tool: MouseTool) => void;
  reset: () => void;
  children?: React.ReactNode;
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
          label: 'Reset View',
          icon: icons.maximize,
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
      {children}
    </div>
  );
});
