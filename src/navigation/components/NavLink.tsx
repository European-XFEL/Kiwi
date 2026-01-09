import * as React from 'react';
import { NavLink as RRNavLink } from 'react-router-dom';
import type { NavLinkProps } from '../types/navigation.types';

export const NavLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(
  (
    {
      to,
      children,
      className = '',
      activeClassName = '',
      exact = false,
      ...rest
    },
    ref
  ) => {
    return (
      <RRNavLink
        ref={ref}
        to={to}
        end={exact}
        className={({ isActive }) =>
          [className, isActive ? activeClassName : ''].filter(Boolean).join(' ')
        }
        {...rest}
      >
        {children}
      </RRNavLink>
    );
  }
);
NavLink.displayName = 'NavLink';
