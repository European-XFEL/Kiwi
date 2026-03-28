import * as React from 'react';
import type { Position } from './types';

const getPositionClass = (pos: Position = 'static'): string =>
  pos === 'fixed'
    ? 'fixed left-0 top-0'
    : pos === 'sticky'
      ? 'sticky left-0 top-0'
      : '';

const toSize = (v: unknown, fallback: string) =>
  typeof v === 'number'
    ? `${v}px`
    : typeof v === 'string' && v.trim()
      ? v
      : fallback;

export type SidebarProps = React.HTMLAttributes<HTMLElement> & {
  position?: Position;
  width?: string | number;
  height?: string | number;
  ariaLabel?: string;
};

export default function Sidebar({
  className,
  position,
  width,
  height,
  ariaLabel = 'Sidebar',
  children,
  ...rest
}: SidebarProps) {
  const positionClass = getPositionClass(position);
  const computedWidth = toSize(width, '20vw');
  const computedHeight = toSize(height, '100dvh');

  return (
    <aside
      role="complementary"
      aria-label={ariaLabel}
      style={{ width: computedWidth, height: computedHeight }}
      className={[positionClass, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </aside>
  );
}
