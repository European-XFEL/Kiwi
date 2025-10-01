import * as React from "react";

export type NavItemProps = React.LiHTMLAttributes<HTMLLIElement>;

export function NavItem({ className, children, ...rest }: NavItemProps) {
  return (
    <li role="none" className={className} {...rest}>
      {children}
    </li>
  );
}
