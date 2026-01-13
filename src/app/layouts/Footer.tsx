import * as React from 'react';
import type { Position } from '@/shared/types';

export type FooterProps = React.HTMLAttributes<HTMLElement> & {
  position?: Position;
  containerClassName?: string;
};

export default function Footer({
  position,
  className,
  children,
  ...rest
}: FooterProps) {
  return (
    <footer
      role="contentinfo"
      className={[
        'border-t bg-white/80 dark:bg-neutral-900/80 w-full h-full px-4',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </footer>
  );
}
