import * as React from 'react';
import { NavLink as RRNavLink } from 'react-router-dom';

export type NavLinkProps = {
  to: string;
  children: React.ReactNode;
  /** Base classes always applied */
  className?: string;
  /** Classes applied only when the link is active */
  activeClassName?: string;
  /** Match exactly (maps to RR’s `end`) */
  exact?: boolean;
};

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
