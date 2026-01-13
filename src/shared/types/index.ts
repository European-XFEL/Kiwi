import { ReactElement } from 'react';

//tailwind dimensions props
export type Position = 'fixed' | 'sticky' | 'static';
type Direction = 'horizontal' | 'vertical';

//routes props
export type RouteProp = {
  path: string;
  element: ReactElement;
  children?: RouteProp[];
};

export type RedirectProp = {
  from: string;
  to: string;
  replace?: boolean;
};

export type RouterProp = {
  routes: RouteProp[];
  indexRedirect?: string;
  fallbackRedirect?: string;
  redirects?: RedirectProp[];
};

//components
export type HeaderProp = {
  children?: React.ReactNode;
  position?: 'sticky' | 'fixed' | 'static';
  className?: string;
};
export type BodyProps = React.HTMLAttributes<HTMLElement> & {
  useOutlet?: boolean;
  id?: string;
};
export type Logo = {
  className?: string;
  imageUrl?: string;
  logoText?: string;
};

export type NavItem = {
  className?: string;
  item: React.ReactNode;
};

export type NavbarProps = {
  className?: string;
  logo?: Logo;
  children: React.ReactNode;
  /** Layout direction: 'horizontal' (top navbar) or 'vertical' (sidebar). */
  direction?: Direction;
  gapClassName?: string /** Optional gap between items (e.g., 'gap-2', 'gap-4'). */;
};

export type SidebarProp = {
  width?: number;
  height?: number;
  isOpen?: Boolean;
  children?: React.ReactNode;
  className?: string;
  position?: 'sticky' | 'fixed' | 'static';
};

//helpers
export type UserInfoProps = {
  showAccessLevel?: boolean;
};

//event emitter
// Union of event names, e.g. "property_changed" | "state_changed" | ...
export type EventName<TEventName extends string = string> = TEventName;

// Listener function – args kept generic for flexibility
export type EventSubscriber = (...args: any[]) => void;

// Map of eventName → listeners[]
export type Events<TEventName extends string = string> = Map<
  EventName<TEventName>,
  EventSubscriber[]
>;
