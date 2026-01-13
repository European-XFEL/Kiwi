import * as React from 'react';
import type { NavbarProps } from '@/shared/types';

const NavigationMenu = React.forwardRef<HTMLElement, NavbarProps>(
  (
    { className, children, direction = 'horizontal', gapClassName, ...rest },
    ref
  ) => {
    const isVertical = direction === 'vertical';
    const listDirectionClass = isVertical ? 'flex-col' : 'flex-row';
    const defaultGap = isVertical ? 'gap-2' : 'gap-4';
    const gap = gapClassName ?? defaultGap;

    return (
      <nav ref={ref} className={className} {...rest}>
        <ul
          role="menubar"
          aria-orientation={direction}
          className={['flex', listDirectionClass, gap]
            .filter(Boolean)
            .join(' ')}
        >
          {children}
        </ul>
      </nav>
    );
  }
);

NavigationMenu.displayName = 'NavigationMenu';
export default NavigationMenu;
