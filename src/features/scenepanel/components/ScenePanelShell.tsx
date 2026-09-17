import React from 'react';

export interface ScenePanelShellProps {
  header?: React.ReactNode;
  viewport: React.ReactNode;
  // Applied to the shell root so it can be the native fullscreen target.
  rootRef?: React.Ref<HTMLDivElement>;
}

export function ScenePanelShell({
  header,
  viewport,
  rootRef,
}: ScenePanelShellProps) {
  return (
    <div
      data-testid="scene-panel"
      ref={rootRef}
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
