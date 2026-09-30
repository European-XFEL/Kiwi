/**
 * Navigation Feature - Type Definitions
 */

import * as React from 'react';

type Direction = 'horizontal' | 'vertical';

export type NavItemProps = React.LiHTMLAttributes<HTMLLIElement>;

export type NavLinkProps = {
  to: string;
  children: React.ReactNode;
  /** Base classes always applied */
  className?: string;
  /** Classes applied only when the link is active */
  activeClassName?: string;
  /** Match exactly (maps to RR's `end`) */
  exact?: boolean;
};

export type NavbarProps = {
  className?: string;
  children: React.ReactNode;
  /** Layout direction: 'horizontal' (top navbar) or 'vertical' (sidebar). */
  direction?: Direction;
  gapClassName?: string /** Optional gap between items (e.g., 'gap-2', 'gap-4'). */;
};
