import * as React from 'react';
import type { Position } from './types';

export type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  position?: Position;
};

export default function Header({
  id,
  children,
  position,
  className,
  ...rest
}: HeaderProps) {
  return (
    <header
      id={id}
      role="banner"
      className={[
        'w-full border-b bg-white/80 dark:bg-neutral-900/80 backdrop-blur',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </header>
  );
}
