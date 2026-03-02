import React from 'react';

interface SceneShellProps {
  className?: string;
  children: React.ReactNode;
}

/**
 * SceneShell — horizontal strip housing side panels and the viewport.
 *
 * Left and right panel slots are stubbed out until the panel
 * components are ready.
 */
export function SceneShell({ className, children }: SceneShellProps) {
  return (
    <div className={className}>
      {/* Left panel slot — project tree (uncomment when ready) */}
      {/* <div className="w-64 shrink-0">Left panel</div> */}

      {children}

      {/* Right panel slot — config editor (uncomment when ready) */}
      {/* <div className="w-64 shrink-0">Right panel</div> */}
    </div>
  );
}
