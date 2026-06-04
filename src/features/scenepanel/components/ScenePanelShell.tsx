import React from 'react';

export interface ScenePanelShellProps {
  header?: React.ReactNode;
  viewport: React.ReactNode;
}

export function ScenePanelShell({ header, viewport }: ScenePanelShellProps) {
  return (
    <div className="flex h-full w-full flex-col border">
      {header ? <div className="shrink-0">{header}</div> : null}
      <div className="relative flex min-h-0 flex-1 border-t">{viewport}</div>
    </div>
  );
}

export default ScenePanelShell;
