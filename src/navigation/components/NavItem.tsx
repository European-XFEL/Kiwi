import type { NavItemProps } from '../types/navigation.types';

export function NavItem({ className, children, ...rest }: NavItemProps) {
  return (
    <li role="none" className={className} {...rest}>
      {children}
    </li>
  );
}
