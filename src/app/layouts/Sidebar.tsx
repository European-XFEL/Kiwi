import * as React from 'react';
import type { Position } from '@/shared/types';
import { getPositionClass } from '@/shared/utils/position';
import { toSize } from '@/shared/utils/to-size';

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
