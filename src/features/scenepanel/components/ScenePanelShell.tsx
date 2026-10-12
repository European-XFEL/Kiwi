import React from 'react';

export interface ScenePanelShellProps {
  header?: React.ReactNode;
  viewport: React.ReactNode;
}

export function ScenePanelShell({ header, viewport }: ScenePanelShellProps) {
  return (
    <div
      data-testid="scene-panel"
      className="flex h-full w-full flex-col border bg-background"
    >
      {header ? <div className="shrink-0">{header}</div> : null}
      <div
        data-testid="scene-panel-viewport"
        className="relative flex min-h-0 flex-1 border-t"
      >
        {viewport}
      </div>
    </div>
  );
}

export default ScenePanelShell;
