/**
 * Navigation Feature - Type Definitions
 */

import * as React from 'react';
import { Button } from '@/components/button';

type Direction = 'horizontal' | 'vertical';

export type LogoProps = React.HTMLAttributes<HTMLDivElement> & {
  imageUrl?: string;
  logoText?: string;
  alt?: string;
  imageClassName?: string;
  textClassName?: string;
};

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

export type NavToggleProps = {
  trigger?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  closeOnContentClick?: boolean;
  contentClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  showFooter?: boolean;
  primaryAction?: React.ReactNode;
  triggerButtonProps?: React.ComponentProps<typeof Button>;
  children?: React.ReactNode;
};

export type Logo = {
  className?: string;
  imageUrl?: string;
  logoText?: string;
};

export type NavbarProps = {
  className?: string;
  logo?: Logo;
  children: React.ReactNode;
  /** Layout direction: 'horizontal' (top navbar) or 'vertical' (sidebar). */
  direction?: Direction;
  gapClassName?: string /** Optional gap between items (e.g., 'gap-2', 'gap-4'). */;
};
