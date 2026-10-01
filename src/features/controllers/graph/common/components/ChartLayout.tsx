import React from 'react';
import { ChartToolBar } from './ChartToolBar';
import type { ViewBox } from '../useViewBox';

export function ChartLayout({
  children,
  viewBox,
  background,
  footer,
}: {
  children: React.ReactNode;
  viewBox: Pick<ViewBox, 'tool' | 'selectTool' | 'reset'>;
  background: string;
  footer?: React.ReactNode;
}) {
  return (
    <div
      className={`flex h-full w-full min-w-0 ${footer ? 'flex-col gap-0.5' : ''}`}
      style={{ backgroundColor: background }}
    >
      <div className="flex min-h-0 flex-1">
        {children}
        <ChartToolBar {...viewBox} />
      </div>
      {footer && <div className="flex shrink-0 flex-col gap-0.5">{footer}</div>}
    </div>
  );
}
