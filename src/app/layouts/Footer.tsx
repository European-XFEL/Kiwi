import * as React from 'react';
import { Position } from './types';

export type FooterProps = React.HTMLAttributes<HTMLElement> & {
  position?: Position;
  containerClassName?: string;
};

export default function Footer({
  id,
  position,
  className,
  children,
  ...rest
}: FooterProps) {
  return (
    <footer
      data-testid="app-footer"
      id={id}
      role="contentinfo"
      className={[
        'border-t bg-white/80 dark:bg-neutral-900/80 w-full px-4',
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
