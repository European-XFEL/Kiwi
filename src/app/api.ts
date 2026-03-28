/**
 * app — Kiwi public API.
 *
 * External consumers should access Kiwi root UI components through this file
 * instead of importing from internal app paths directly.
 */

export { default as KiwiApp } from './App';

export { default as KiwiLayout } from './layouts/Layout';
export type { LayoutProps as KiwiLayoutProps } from './layouts/Layout';

export { default as KiwiHeader } from './layouts/Header';
export type { HeaderProps as KiwiHeaderProps } from './layouts/Header';

export { default as KiwiBody } from './layouts/Body';
export type { BodyProps as KiwiBodyProps } from './layouts/Body';

export { default as KiwiSidebar } from './layouts/Sidebar';
export type { SidebarProps as KiwiSidebarProps } from './layouts/Sidebar';

export { default as KiwiFooter } from './layouts/KiwiFooter';
