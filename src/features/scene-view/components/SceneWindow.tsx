import React from 'react';

interface SceneWindowProps {
  className?: string;
  children: React.ReactNode;
}

/** SceneWindow — root container for everything SceneView owns. */
export function SceneWindow({ className, children }: SceneWindowProps) {
  return <div className={className}>{children}</div>;
}
